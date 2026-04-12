import {
  BILLING_EMAIL_FOOTER_TEXT,
  billingEmailFooterHtml,
  emailParagraphHtml,
  escapeHtml,
  joinTextParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";

const SUBJECT = "Payment Received – Tax Filing in Progress";

const BODY_FONT =
  "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;";
const P_TIGHT = `margin:0 0 4px;${BODY_FONT}font-size:15px;line-height:1.55;color:#334155;`;

function bestRegardsSignatureHtml(signerName = "Reiner") {
  const safe = escapeHtml(signerName);
  return `<p style="margin:22px 0 0;${BODY_FONT}font-size:15px;line-height:1.5;color:#334155;">Best regards,</p><p style="${P_TIGHT}"><strong>${safe}</strong></p>`;
}

function bestRegardsSignatureText(signerName = "Reiner") {
  return `Best regards,\n${signerName}`;
}

export function paymentReceivedTaxFilingInProgressSubject(): string {
  return SUBJECT;
}

/** Client-facing “paid, work started” notice (HTML matches site email conventions). */
export function buildPaymentReceivedTaxFilingInProgressEmail(
  clientName: string,
  publicOrderId: string
): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  const name = clientName.trim() || "there";
  const safe = escapeHtml(name);
  const oid = publicOrderId.trim() || "—";
  const safeOid = escapeHtml(oid);

  const textBody = joinTextParagraphs([
    `Dear ${name},`,
    `Thank you for your payment. Your tax filing is now in progress.`,
    `We will be processing your tax return shortly. Once your filing has been completed, we will notify you immediately.`,
    `For your reference, your Order ID is ${oid}.`,
    `Thank you for trusting us with your tax filing. We're here to make tax filing simple, accurate, and stress-free every time.`,
    bestRegardsSignatureText("Reiner"),
    BILLING_EMAIL_FOOTER_TEXT,
  ]);

  const inner = [
    emailParagraphHtml(`Dear ${safe},`),
    emailParagraphHtml("Thank you for your payment. Your tax filing is now in progress."),
    emailParagraphHtml(
      "We will be processing your tax return shortly. Once your filing has been completed, we will notify you immediately."
    ),
    emailParagraphHtml(
      `For your reference, your Order ID is <strong>${safeOid}</strong>.`
    ),
    emailParagraphHtml(
      "Thank you for trusting us with your tax filing. We're here to make tax filing simple, accurate, and stress-free every time."
    ),
    bestRegardsSignatureHtml("Reiner"),
    billingEmailFooterHtml(),
  ].join("");

  const htmlBody = wrapEmailMainHtml(inner);

  return { subject: SUBJECT, textBody, htmlBody };
}
