import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { config } from "@/lib/config";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { buildBillingQuoteEmail } from "@/lib/email/billingQuoteEmail";

const Schema = z.object({
  userEmail: z.string().email(),
  baseAmountPhp: z.coerce.number().int().positive().max(50_000_000),
  clientNote: z.string().max(2000).optional().or(z.literal("")),
  expiresInDays: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (!Number.isFinite(n) || n < 1 || n > 365) return undefined;
      return Math.floor(n);
    }),
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
  let uploadedAttachment:
    | {
        filename: string;
        content: Buffer;
        contentType: string;
      }
    | null = null;
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
    const file = form.get("billingAttachment");
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return ct.includes("application/json")
          ? new NextResponse("Attachment must be an image file.", { status: 400 })
          : redirectBillingError(req, "attachment_type");
      }
      if (file.size > 10 * 1024 * 1024) {
        return ct.includes("application/json")
          ? new NextResponse("Attachment too large. Max size is 10MB.", { status: 400 })
          : redirectBillingError(req, "attachment_size");
      }
      uploadedAttachment = {
        filename: file.name || "billing-attachment",
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
      };
    }
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 })
      : redirectBillingError(req, "invalid_form");
  }

  const { userEmail, baseAmountPhp, clientNote, expiresInDays } = parsed.data;
  const email = userEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return ct.includes("application/json")
      ? new NextResponse("User not found for provided email.", { status: 404 })
      : redirectBillingError(req, "user_not_found");
  }

  const expiresAt = expiresInDays != null ? new Date(Date.now() + expiresInDays * 86400000) : null;
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
    expiresAt,
  });

  const attachment = uploadedAttachment || built.attachments[0];
  const attachmentText = attachment ? attachmentToText(attachment.content) : "(no attachment)";
  const isImageAttachment = Boolean(attachment?.contentType?.startsWith("image/"));
  const imagePreviewSrc = isImageAttachment
    ? `data:${attachment!.contentType};base64,${Buffer.from(attachment!.content).toString("base64")}`
    : "";

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
    iframe { width: 100%; min-height: 420px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
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
    <div><b>Attachment:</b> ${esc(attachment?.filename || "N/A")}</div>
  </div>
  <h2>Plain Text Body</h2>
  <div class="card"><pre>${esc(built.textBody)}</pre></div>
  <div class="divider"></div>
  <h2>Attachment Preview</h2>
  ${
    isImageAttachment
      ? `<div class="card"><img src="${imagePreviewSrc}" alt="Attachment preview" style="max-width:100%;height:auto;border-radius:8px;" /></div>`
      : `<div class="card"><pre>${esc(attachmentText)}</pre></div>`
  }
  <div class="divider"></div>
  <h2>HTML Email Rendering</h2>
  <iframe srcdoc="${esc(built.htmlBody)}"></iframe>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

