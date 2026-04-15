/**
 * Mail and billing-link values read from `process.env` at request time.
 * Do not use `lib/config` for these when sending mail — that module is imported by client
 * components and non-public env keys may not populate reliably on the server.
 */
export function getMailRuntimeEnv() {
  const baseRaw =
    (process.env.SITE_BASE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const siteBaseUrl = baseRaw.replace(/\/+$/, "") || "http://localhost:3000";

  return {
    siteBaseUrl,
    supportEmail: (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim(),
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance",
    smtpFrom: (process.env.SMTP_FROM || "").trim(),
    smtpBcc: (process.env.SMTP_BCC || "").trim(),
    referralFeeReductionPercent: Number(process.env.REFERRAL_FEE_REDUCTION_PERCENT || "10"),
  };
}
