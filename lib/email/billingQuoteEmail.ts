import { config } from "@/lib/config";
import type { MailAttachment } from "@/lib/email/mailer";
import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";

export async function buildBillingQuoteEmail(opts: {
  clientFullName: string;
  baseAmountPhp: number;
  discountPhp: number;
  finalAmountPhp: number;
  confirmedCreditCount: number;
  percentPerCredit: number;
  payUrl: string;
  clientNote: string | null;
  expiresAt: Date | null;
}): Promise<{ subject: string; textBody: string; htmlBody: string; attachments: MailAttachment[] }> {
  const { clientFullName, payUrl, clientNote, expiresAt } = opts;
  const attachments: MailAttachment[] = [];

  const rendered = await renderClientEmailTemplate("BILLING_QUOTE", {
    clientFullName,
    payUrl,
    clientNote: clientNote?.trim() || "",
    expiresDate: expiresAt ? expiresAt.toLocaleDateString("en-PH", { dateStyle: "long" }) : "",
  });
  return { subject: rendered.subject, textBody: rendered.textBody, htmlBody: rendered.htmlBody, attachments };
}
