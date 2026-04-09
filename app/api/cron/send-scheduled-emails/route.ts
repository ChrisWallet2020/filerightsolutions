// app/api/cron/send-scheduled-emails/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";

const BILLING_EMAIL_FOOTER_TEXT = [
  "—",
  "",
  "FileRight Solutions is operated by FileRight Document Facilitation Services",
  "DTI-Registered, Philippines",
  "",
  "This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.",
].join("\n");

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function billingEmailFooterHtml(): string {
  return `<div style="margin-top:36px;padding-top:28px;border-top:1px solid #e2e8f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.65;color:#64748b;max-width:560px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 0 14px 0;">
        <div style="font-size:13px;font-weight:600;color:#334155;letter-spacing:0.02em;">FileRight Solutions</div>
        <div style="margin-top:6px;color:#475569;">Operated by <strong style="color:#1e293b;font-weight:600;">FileRight Document Facilitation Services</strong></div>
        <div style="margin-top:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">DTI-Registered · Philippines</div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 0 0 0;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
          This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

function textToSimpleHtml(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return blocks
    .map((b) => `<p style="margin:0 0 14px;line-height:1.65;color:#0f172a;">${escapeHtml(b).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export async function POST(req: Request) {
  const key = req.headers.get("x-cron-key");
  if (process.env.CRON_KEY && key !== process.env.CRON_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const batch = await prisma.scheduledEmail.findMany({
    where: {
      sendAt: { lte: now },
      sentAt: null,
      failedAt: null,
    },
    take: 25,
  });

  for (const e of batch) {
    try {
      const shouldUseBillingFooter = e.type === "EVALUATION_NO_REDUCTION_UPDATE";
      const textBody = shouldUseBillingFooter ? `${e.body}\n\n${BILLING_EMAIL_FOOTER_TEXT}` : e.body;
      const htmlBody = shouldUseBillingFooter
        ? `${textToSimpleHtml(e.body)}${billingEmailFooterHtml()}`
        : undefined;

      const info = await sendMail(e.toEmail, e.subject, textBody, htmlBody);
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: { sentAt: new Date() },
      });
    } catch (err: any) {
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: { failedAt: new Date(), failReason: err?.message || "Send failed" },
      });
    }
  }

  return NextResponse.json({ processed: batch.length });
}