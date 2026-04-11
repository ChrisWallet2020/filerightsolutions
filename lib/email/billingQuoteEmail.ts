import { config } from "@/lib/config";
import type { MailAttachment } from "@/lib/email/mailer";
import {
  BILLING_EMAIL_FOOTER_TEXT,
  billingEmailFooterHtml,
  emailParagraphHtml,
  emailSignatureHtml,
  emailSignatureText,
  escapeHtml,
  joinTextParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";

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
    "The final tax computation was performed using BIR-accredited software, showing the difference between your current filing and the optimized version. Figures below are your quoted service fee, any credit reduction, and amount due to proceed.",
    "",
    `Client: ${opts.clientFullName}`,
    "",
    "Service fee (PHP):            " + opts.baseAmountPhp.toLocaleString("en-PH"),
    "Credit reduction (PHP):       " +
      (opts.discountPhp > 0 ? `-${opts.discountPhp.toLocaleString("en-PH")}` : "0") +
      (opts.confirmedCreditCount > 0 ? ` (${opts.percentPerCredit}% applied)` : ""),
    "Total payment (PHP):          " + opts.finalAmountPhp.toLocaleString("en-PH"),
    "",
    "Amounts above are your bill for proceeding after evaluation; the secure payment page applies the same figures.",
    "",
    "Secure payment link:",
    opts.payUrl,
  ];
  if (opts.clientNote?.trim()) {
    lines.push("", "Note from our office:", opts.clientNote.trim());
  }
  if (opts.expiresAt) {
    lines.push(
      "",
      "Payment link valid until: " +
        opts.expiresAt.toLocaleDateString("en-PH", { dateStyle: "long" })
    );
  }
  lines.push("", "---", `${config.siteName} — for your records.`);
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

  const textBody = joinTextParagraphs([
    `Dear ${clientFullName},`,
    `Your tax evaluation has been completed.`,
    `Please see the attached file for your computed results and recommended adjustment. The final tax computation was performed using BIR-accredited software, showing the difference between your current filing and the optimized version.`,
    `If you would like to proceed, you may complete your payment at:\n${payUrl}`,
    `Once payment is confirmed, we will handle the correction and filing process accordingly.`,
    `If anything in the evaluation needs clarification, feel free to reply to this email.`,
    emailSignatureText("Reiner"),
    `Questions? Reply to this message or contact ${config.supportEmail}.`,
    BILLING_EMAIL_FOOTER_TEXT,
  ]);

  const payLinkHtml = `<a href="${escapeHtml(payUrl)}">${escapeHtml(payUrl)}</a>`;
  const extraNote =
    clientNote?.trim() || expiresAt
      ? emailParagraphHtml(
          [
            clientNote?.trim()
              ? `<b>Note from our office:</b> ${escapeHtml(clientNote.trim())}`
              : "",
            expiresAt
              ? `Payment link expires <b>${escapeHtml(
                  expiresAt.toLocaleDateString("en-PH", { dateStyle: "long" })
                )}</b>.`
              : "",
          ]
            .filter(Boolean)
            .join("<br/>")
        )
      : "";

  const innerHtml = [
    emailParagraphHtml(`Dear ${escapeHtml(clientFullName)},`),
    emailParagraphHtml("Your tax evaluation has been completed."),
    emailParagraphHtml(
      "Please see the attached file for your computed results and recommended adjustment. The final tax computation was performed using BIR-accredited software, showing the difference between your current filing and the optimized version."
    ),
    emailParagraphHtml(`If you would like to proceed, you may complete your payment at ${payLinkHtml}`),
    emailParagraphHtml(
      "Once payment is confirmed, we will handle the correction and filing process accordingly."
    ),
    emailParagraphHtml("If anything in the evaluation needs clarification, feel free to reply to this email."),
    emailSignatureHtml("Reiner"),
    extraNote,
    `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.55;color:#475569;">Questions? Reply to this message or contact <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#1e40af;font-weight:600;text-decoration:none;border-bottom:1px solid #cbd5e1;">${escapeHtml(config.supportEmail)}</a>.</p>`,
    billingEmailFooterHtml(),
  ].join("");

  const htmlBody = wrapEmailMainHtml(innerHtml);

  return { subject, textBody, htmlBody, attachments };
}
