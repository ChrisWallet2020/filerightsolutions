import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  isPaymentQuoteOperatorAuthed,
  paymentQuoteReturnUrl,
  quoteSlotRoleFromRequest,
} from "@/lib/admin/paymentQuoteAccess";
import { config } from "@/lib/config";
import type { CollectedBillingImage } from "@/lib/admin/billingAttachments";
import {
  isStagingReadyForSidePreview,
  loadStagingSlotsForPreview,
} from "@/lib/admin/paymentQuoteStaging";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { buildBillingQuoteEmail } from "@/lib/email/billingQuoteEmail";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";
import { getAutoBillingBaseAmountForUser } from "@/lib/admin/billingAutoFee";
import { clientPaymentNoticePath } from "@/lib/clientPaymentFlow";

const Schema = z.object({
  userEmail: z.string().email(),
  clientNote: z.string().max(2000).optional().or(z.literal("")),
  serviceFeeOverridePhp: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const raw = typeof value === "number" ? String(value) : value.trim();
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return Number.NaN;
      return n;
    })
    .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 1_000_000), {
      message: "service_fee_override_must_be_integer_php_1_to_1000000",
    })
    .optional(),
});

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function redirectBillingError(req: Request, code: string) {
  const url = new URL(paymentQuoteReturnUrl(req), req.url);
  url.searchParams.set("previewError", code);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let raw: Record<string, unknown>;
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 })
      : redirectBillingError(req, "invalid_form");
  }

  const { userEmail, clientNote, serviceFeeOverridePhp } = parsed.data;
  const email = userEmail.trim().toLowerCase();
  const eligible = await findUserWith1701aSubmissionByEmail(email);
  if (!eligible) {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const code = exists ? "evaluation_not_submitted" : "user_not_found";
    return ct.includes("application/json")
      ? new NextResponse(
          code === "evaluation_not_submitted"
            ? "That account has not submitted a 1701A evaluation yet."
            : "User not found for provided email.",
          { status: 404 }
        )
      : redirectBillingError(req, code);
  }
  const user = eligible;

  const slotRole = quoteSlotRoleFromRequest(req);
  if (!(await isStagingReadyForSidePreview(email, slotRole))) {
    return ct.includes("application/json")
      ? new NextResponse(
          "Upload the required quote images for this workspace before preview.",
          { status: 400 },
        )
      : redirectBillingError(req, "preview_side_incomplete");
  }

  const slotRows = await loadStagingSlotsForPreview(email);
  const uploadedImages: CollectedBillingImage[] = slotRows
    .filter((r): r is { slot: number; image: CollectedBillingImage } => "image" in r)
    .map((r) => r.image);

  const canOverrideFee = quoteSlotRoleFromRequest(req) === "admin";
  const autoBaseAmountPhp = await getAutoBillingBaseAmountForUser(user.id);
  const baseAmountPhp =
    canOverrideFee && typeof serviceFeeOverridePhp === "number"
      ? serviceFeeOverridePhp
      : autoBaseAmountPhp;
  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: user.id, evaluationCompleted: true },
  });

  const totals = computeQuotedPaymentTotals(baseAmountPhp, confirmedCredits);
  const baseUrl = String(config.baseUrl).replace(/\/$/, "");
  const payUrl = `${baseUrl}${clientPaymentNoticePath("PREVIEW_TOKEN")}`;

  const built = await buildBillingQuoteEmail({
    clientFullName: user.fullName.trim() || "Client",
    baseAmountPhp: totals.baseAmountPhp,
    discountPhp: totals.discountPhp,
    finalAmountPhp: totals.finalAmountPhp,
    confirmedCreditCount: confirmedCredits,
    percentPerCredit: config.referralFeeReductionPercent,
    payUrl,
    clientNote: clientNote?.trim() || null,
    expiresAt: null,
  });

  const attachmentList = [
    ...slotRows.map((row) =>
      "missing" in row ? `Image ${row.slot} (pending)` : row.image.filename,
    ),
  ];
  const imageBlocks = slotRows
    .map((row) =>
      "missing" in row
        ? `<div class="card muted" style="margin-bottom:12px;"><p><b>Image ${row.slot}</b></p><p>Not uploaded yet — final email will include this attachment only after all four images are staged.</p></div>`
        : `<div class="card" style="margin-bottom:12px;"><p><b>${esc(row.image.filename)}</b></p><img src="data:${esc(
            row.image.contentType || "image/png"
          )};base64,${Buffer.from(row.image.content as Buffer).toString("base64")}" alt="" style="max-width:100%;height:auto;border-radius:8px;" /></div>`,
    )
    .join("");

  const quoteReturnPath = paymentQuoteReturnUrl(req);

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Quote Email Preview</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 16px; font-size: 22px; }
    h2 { margin: 20px 0 8px; font-size: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fff; }
    .muted { color: #64748b; font-size: 13px; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 13px; line-height: 1.45; }
    .divider { height: 1px; background: #e2e8f0; margin: 18px 0; }
    iframe { width: 100%; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
    .emailHtmlFrame { min-height: 480px; margin-top: 4px; display: block; }
    .topline { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>Quote Email Preview</h1>
  <div class="muted topline">No email sent. No quote created. This is a content preview only.</div>
  <div class="card">
    <div><b>To:</b> ${esc(user.email)}</div>
    <div><b>Subject:</b> ${esc(built.subject)}</div>
    <div><b>Attachments:</b> ${esc(attachmentList.join(", "))}</div>
  </div>
  <iframe class="emailHtmlFrame" srcdoc="${esc(built.htmlBody)}"></iframe>
  <div class="divider"></div>
  <h2>Quote images (preview)</h2>
  <p class="muted" style="margin:0 0 12px;">Send still requires all four images. Empty slots show as pending below.</p>
  ${
    uploadedImages.length || slotRows.some((r) => "missing" in r)
      ? imageBlocks
      : `<div class="card muted">No images attached.</div>`
  }
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

