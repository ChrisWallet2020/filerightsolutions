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
  const subject = "Your BIR filing has been processed";

  const textBody = joinTextParagraphs([
    `Hi ${firstName},`,
    `Great news! Your BIR tax return has been successfully processed and submitted. You should have also received a confirmation email from BIR acknowledging receipt of your filing.`,
    `No further action is needed unless you still have tax payable. If you do, please complete your payment through any BIR-accredited channels (e.g., Landbank, DBP, GCash, etc.) before the deadline.`,
    `If BIR raises any questions, notices, or concerns regarding your filing, we will handle it for you. We will take care of everything needed to resolve it.`,
    `Thank you for trusting us with your tax filing. We're here to make taxes simple, accurate, and stress-free every time.`,
    emailSignatureText("Reiner"),
    BILLING_EMAIL_FOOTER_TEXT,
  ]);

  const inner = [
    emailParagraphHtml(`Hi ${safe},`),
    emailParagraphHtml(`<strong>Great news!</strong> 🎉`),
    emailParagraphHtml(
      "Your BIR tax return has been successfully processed and submitted. You should have also received a confirmation email from BIR acknowledging receipt of your filing."
    ),
    emailParagraphHtml(
      "<strong>No further action is needed</strong> unless you still have tax payable. If you do, please complete your payment through any BIR-accredited channels (e.g., Landbank, DBP, GCash, etc.) before the deadline."
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

  const htmlBody = wrapEmailMainHtml(inner);

  return { subject, textBody, htmlBody };
}
