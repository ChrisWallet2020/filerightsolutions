import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";
import { config } from "@/lib/config";

export function firstNameFromFullName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] || t;
}

export async function buildFilingCompleteNotifyEmail(firstName: string): Promise<{
  subject: string;
  textBody: string;
  htmlBody: string;
}> {
  const supportEmail = config.supportEmail.trim() || "support@filerightsolutions.com";
  const epayUrl = "https://www.bir.gov.ph/ePay";
  return renderClientEmailTemplate("FILING_COMPLETE_NOTIFY", {
    firstName,
    supportEmail,
    epayUrl,
  });
}
