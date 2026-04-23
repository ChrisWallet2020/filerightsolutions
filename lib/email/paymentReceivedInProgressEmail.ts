import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";

const SUBJECT_FALLBACK = "Payment Received – Tax Filing in Progress";

/** Client-facing “paid, work started” notice (HTML matches site email conventions). */
export async function buildPaymentReceivedTaxFilingInProgressEmail(
  clientName: string,
  publicOrderId: string
): Promise<{
  subject: string;
  textBody: string;
  htmlBody: string;
}> {
  const rendered = await renderClientEmailTemplate("PAYMENT_RECEIVED_IN_PROGRESS", {
    clientName: clientName.trim() || "there",
    publicOrderId: publicOrderId.trim() || "—",
  });
  return {
    subject: rendered.subject || SUBJECT_FALLBACK,
    textBody: rendered.textBody,
    htmlBody: rendered.htmlBody,
  };
}
