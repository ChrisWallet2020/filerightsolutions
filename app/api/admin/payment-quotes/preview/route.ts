import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { config } from "@/lib/config";
import {
  collectBillingImagesFromFormData,
  type CollectedBillingImage,
} from "@/lib/admin/billingAttachments";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { buildBillingQuoteEmail } from "@/lib/email/billingQuoteEmail";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";

const Schema = z.object({
  userEmail: z.string().email(),
  baseAmountPhp: z.coerce.number().int().positive().max(50_000_000),
  clientNote: z.string().max(2000).optional().or(z.literal("")),
});

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attachmentToText(content: Buffer | Uint8Array): string {
  return Buffer.isBuffer(content) ? content.toString("utf-8") : Buffer.from(content).toString("utf-8");
}

function redirectBillingError(req: Request, code: string) {
  const url = new URL("/admin/billing", req.url);
  url.searchParams.set("previewError", code);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let raw: Record<string, unknown>;
  let uploadedImages: CollectedBillingImage[] = [];
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
    const imgResult = await collectBillingImagesFromFormData(form);
    if (imgResult.ok === false) {
      const msg =
        imgResult.error === "attachment_type"
          ? "Images must be image files."
          : "Each image must be 10MB or smaller.";
      return ct.includes("application/json")
        ? new NextResponse(msg, { status: 400 })
        : redirectBillingError(req, imgResult.error);
    }
    uploadedImages = imgResult.images;
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 })
      : redirectBillingError(req, "invalid_form");
  }

  const { userEmail, baseAmountPhp, clientNote } = parsed.data;
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
  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: user.id, evaluationCompleted: true },
  });

  const totals = computeQuotedPaymentTotals(baseAmountPhp, confirmedCredits);
  const baseUrl = String(config.baseUrl).replace(/\/$/, "");
  const payUrl = `${baseUrl}/account/payment?q=PREVIEW_TOKEN`;

  const built = buildBillingQuoteEmail({
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

  const summaryAttachment = built.attachments[0];
  const summaryText = summaryAttachment ? attachmentToText(summaryAttachment.content) : "(no summary)";
  const attachmentList = [
    ...uploadedImages.map((a) => a.filename),
    summaryAttachment?.filename || "summary.txt",
  ];
  const imageBlocks = uploadedImages
    .map(
      (img) =>
        `<div class="card" style="margin-bottom:12px;"><p><b>${esc(img.filename)}</b></p><img src="data:${esc(
          img.contentType || "image/png"
        )};base64,${Buffer.from(img.content).toString("base64")}" alt="" style="max-width:100%;height:auto;border-radius:8px;" /></div>`
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Billing Email Preview</title>
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
    .backBtn { display: inline-block; margin: 0 0 12px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; text-decoration: none; color: #0f172a; font-size: 13px; font-weight: 600; background: #fff; }
  </style>
</head>
<body>
  <a class="backBtn" href="/admin/billing">← Back to Billing</a>
  <span class="muted" style="margin-left:10px;">Tip: you can close this tab — the form stays open in the other tab.</span>
  <h1>Billing Email Preview</h1>
  <div class="muted topline">No email sent. No quote created. This is a content preview only.</div>
  <div class="card">
    <div><b>To:</b> ${esc(user.email)}</div>
    <div><b>Subject:</b> ${esc(built.subject)}</div>
    <div><b>Attachments:</b> ${esc(attachmentList.join(", "))}</div>
  </div>
  <iframe class="emailHtmlFrame" srcdoc="${esc(built.htmlBody)}"></iframe>
  <div class="divider"></div>
  <h2>Your billing images (as sent)</h2>
  ${
    uploadedImages.length
      ? imageBlocks
      : `<div class="card muted">No images attached.</div>`
  }
  <div class="divider"></div>
  <h2>Billing summary file (.txt)</h2>
  <div class="card"><pre>${esc(summaryText)}</pre></div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

