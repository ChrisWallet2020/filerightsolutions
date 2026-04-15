/**
 * SMTP-related and billing-link values read from `process.env` at request time.
 * Import only from server Route Handlers — not from `lib/config` (also imported by client Header).
 */
export function smtpSendContext() {
  const baseRaw =
    (process.env.SITE_BASE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const siteBaseUrl = baseRaw.replace(/\/+$/, "") || "http://localhost:3000";

  const supportEmail = (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance";
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpFromEnv = (process.env.SMTP_FROM || "").trim();
  const smtpBcc = (process.env.SMTP_BCC || "").trim();
  const mailbox = smtpUser || supportEmail;

  return {
    siteBaseUrl,
    supportEmail,
    siteName,
    smtpBcc,
    smtpFromEnv,
    /** When SMTP_FROM is unset: From must match authenticated user for most providers. */
    fromOverrideWhenNoSmtpFrom: `${siteName} <${mailbox}>`,
    referralFeeReductionPercent: Number(process.env.REFERRAL_FEE_REDUCTION_PERCENT || "10"),
  };
}
