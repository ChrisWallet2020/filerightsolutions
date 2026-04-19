import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
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
import { config } from "@/lib/config";

export function firstNameFromFullName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] || t;
}

export function buildFilingCompleteNotifyEmail(firstName: string): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  const safe = escapeHtml(firstName);
  const supportEmail = config.supportEmail.trim() || "support@filerightsolutions.com";
  const safeSupport = escapeHtml(supportEmail);
  const epayUrl = "https://www.bir.gov.ph/ePay";
  const subject = "Your BIR filing has been processed";

  const textBody = joinTextParagraphs([
    `Hi ${firstName},`,
    `Great news! 🎉`,
    `Your BIR tax return has been successfully processed and submitted. You should receive a confirmation email from BIR acknowledging receipt of your filing shortly.`,
    `If you do not receive the confirmation email within 24 hours, please contact our support team at ${supportEmail}, and we will assist you right away.`,
    `No further action is needed unless you still have tax payable. If you do, you may complete your payment through any BIR-accredited channels (e.g., Landbank, DBP, GCash, etc.) or online via the official BIR payment portal:`,
    `👉 ${epayUrl}`,
    `Please ensure payment is completed before the applicable deadline to avoid penalties.`,
    `If BIR raises any questions, notices, or concerns regarding your filing, we will handle it for you. We will take care of everything needed to resolve it.`,
    `Thank you for trusting us with your tax filing. We're here to make taxes simple, accurate, and stress-free every time.`,
    emailSignatureText("Reiner"),
    BILLING_EMAIL_FOOTER_TEXT,
  ]);

  const inner = [
    emailParagraphHtml(`Hi ${safe},`),
    emailParagraphHtml(`<strong>Great news!</strong> 🎉`),
    emailParagraphHtml(
      "Your BIR tax return has been successfully processed and submitted. You should receive a confirmation email from BIR acknowledging receipt of your filing shortly."
    ),
    emailParagraphHtml(
      `If you do not receive the confirmation email within 24 hours, please contact our support team at <a href="mailto:${escapeHtml(supportEmail)}">${safeSupport}</a>, and we will assist you right away.`
    ),
    emailParagraphHtml(
      "<strong>No further action is needed</strong> unless you still have tax payable. If you do, you may complete your payment through any BIR-accredited channels (e.g., Landbank, DBP, GCash, etc.) or online via the official BIR payment portal:"
    ),
    emailParagraphHtml(
      `👉 <a href="${escapeHtml(epayUrl)}" style="color:#1e40af;">${escapeHtml(epayUrl)}</a>`
    ),
    emailParagraphHtml(
      "Please ensure payment is completed before the applicable deadline to avoid penalties."
    ),
    emailParagraphHtml(
      "If BIR raises any questions, notices, or concerns regarding your filing, we will handle it for you. We will take care of everything needed to resolve it."
    ),
    emailParagraphHtml(
      "Thank you for trusting us with your tax filing. We’re here to make taxes simple, accurate, and stress-free every time."
    ),
    emailSignatureHtml("Reiner"),
    billingEmailFooterHtml(),
  ].join("");

  const htmlBody = wrapEmailMainHtml(inner, clientEmailBranding());

  return { subject, textBody, htmlBody };
}
