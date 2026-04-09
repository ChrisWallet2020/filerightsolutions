import { config } from "@/lib/config";
import type { MailAttachment } from "@/lib/email/mailer";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BILLING_EMAIL_FOOTER_TEXT = [
  "—",
  "",
  "FileRight Solutions is operated by FileRight Document Facilitation Services",
  "DTI-Registered, Philippines",
  "",
  "This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.",
].join("\n");

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

function buildBillingAttachmentText(opts: {
  clientFullName: string;
  baseAmountPhp: number;
  discountPhp: number;
  finalAmountPhp: number;
  confirmedCreditCount: number;
  percentPerCredit: number;
  payUrl: string;
  clientNote: string | null;
  expiresAt: Date | null;
}): string {
  const lines = [
    "BIR Tax Evaluation — Computed results and billing summary",
    "============================================================",
    "",
    "The final tax computation was performed using BIR-accredited software, showing the",
    "difference between your current filing and the optimized version. Figures below are",
    "your quoted service fee, any credit reduction, and amount due to proceed.",
    "",
    `Client: ${opts.clientFullName}`,
    "",
    "Service fee (PHP):            " + opts.baseAmountPhp.toLocaleString("en-PH"),
    "Credit reduction (PHP):       " +
      (opts.discountPhp > 0 ? `-${opts.discountPhp.toLocaleString("en-PH")}` : "0") +
      (opts.confirmedCreditCount > 0
        ? ` (${opts.percentPerCredit}% applied)`
        : ""),
    "Total payment (PHP):          " + opts.finalAmountPhp.toLocaleString("en-PH"),
    "",
    "Amounts above are your bill for proceeding after evaluation; the secure payment page applies the same figures.",
    "",
    "Secure payment link:",
    opts.payUrl,
    "",
  ];
  if (opts.clientNote?.trim()) {
    lines.push("Note from our office:", opts.clientNote.trim(), "");
  }
  if (opts.expiresAt) {
    lines.push(
      "Payment link valid until: " +
        opts.expiresAt.toLocaleDateString("en-PH", { dateStyle: "long" }),
      ""
    );
  }
  lines.push("---", `${config.siteName} — for your records.`);
  return lines.join("\n");
}

export function buildBillingQuoteEmail(opts: {
  clientFullName: string;
  baseAmountPhp: number;
  discountPhp: number;
  finalAmountPhp: number;
  confirmedCreditCount: number;
  percentPerCredit: number;
  payUrl: string;
  clientNote: string | null;
  expiresAt: Date | null;
}): { subject: string; textBody: string; htmlBody: string; attachments: MailAttachment[] } {
  const { clientFullName, payUrl, clientNote, expiresAt } = opts;

  const subject = "BIR Tax Evaluation Results";

  const attachmentText = buildBillingAttachmentText(opts);
  const attachments: MailAttachment[] = [
    {
      filename: "BIR_Tax_Evaluation_Billing_Summary.txt",
      content: Buffer.from(attachmentText, "utf-8"),
      contentType: "text/plain; charset=utf-8",
    },
  ];

  const textBody = [
    `Dear ${clientFullName},`,
    ``,
    `Your tax evaluation has been completed.`,
    ``,
    `Please see the attached file for your computed results and recommended adjustment. The final tax computation was performed using BIR-accredited software, showing the difference between your current filing and the optimized version.`,
    ``,
    `If you would like to proceed, you may complete your payment at:`,
    payUrl,
    ``,
    `Once payment is confirmed, we will handle the correction and filing process accordingly.`,
    ``,
    `If anything in the evaluation needs clarification, feel free to reply to this email.`,
    ``,
    `Sincerely,`,
    `Reiner`,
    ``,
    `Questions? Reply to this message or contact ${config.supportEmail}.`,
    ``,
    BILLING_EMAIL_FOOTER_TEXT,
  ].join("\n");

  const payLinkHtml = `<a href="${escapeHtml(payUrl)}">${escapeHtml(payUrl)}</a>`;
  const extraNote =
    clientNote?.trim() || expiresAt
      ? `<p style="font-size:14px;color:#64748b;">${
          clientNote?.trim()
            ? `<b>Note from our office:</b> ${escapeHtml(clientNote.trim())}<br/>`
            : ""
        }${
          expiresAt
            ? `Payment link expires <b>${escapeHtml(
                expiresAt.toLocaleDateString("en-PH", { dateStyle: "long" })
              )}</b>.`
            : ""
        }</p>`
      : "";

  const htmlBody = `<p>Dear ${escapeHtml(clientFullName)},</p>
<p>Your tax evaluation has been completed.</p>
<p>Please see the attached file for your computed results and recommended adjustment. The final tax computation was performed using BIR-accredited software, showing the difference between your current filing and the optimized version.</p>
<p>If you would like to proceed, you may complete your payment at ${payLinkHtml}</p>
<p>Once payment is confirmed, we will handle the correction and filing process accordingly.</p>
<p>If anything in the evaluation needs clarification, feel free to reply to this email.</p>
<p>Sincerely,<br/>Reiner</p>
${extraNote}
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#475569;">Questions? Reply to this message or contact <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#0f172a;font-weight:600;text-decoration:none;border-bottom:1px solid #cbd5e1;">${escapeHtml(config.supportEmail)}</a>.</p>
${billingEmailFooterHtml()}`;

  return { subject, textBody, htmlBody, attachments };
}
