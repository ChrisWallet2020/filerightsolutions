import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import {
  BILLING_EMAIL_FOOTER_TEXT,
  billingEmailFooterHtml,
  joinTextParagraphs,
  textToEmailHtmlParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";

export function buildAdminCustomClientEmail(opts: { body: string }) {
  const body = opts.body.trim();
  const textBody = joinTextParagraphs([body, BILLING_EMAIL_FOOTER_TEXT]);
  const htmlBody = wrapEmailMainHtml(
    `${textToEmailHtmlParagraphs(body)}${billingEmailFooterHtml()}`,
    clientEmailBranding()
  );
  return { textBody, htmlBody };
}
