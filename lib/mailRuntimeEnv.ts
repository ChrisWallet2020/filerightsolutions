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

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance";
  const supportEmail = (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpFrom = (process.env.SMTP_FROM || "").trim();

  return {
    siteBaseUrl,
    supportEmail,
    siteName,
    smtpUser,
    smtpFrom,
    smtpBcc: (process.env.SMTP_BCC || "").trim(),
    referralFeeReductionPercent: Number(process.env.REFERRAL_FEE_REDUCTION_PERCENT || "10"),
  };
}

/**
 * Envelope From when SMTP_FROM is unset. Must use the authenticated mailbox (SMTP_USER) for
 * Gmail, Microsoft 365, Zoho, etc. — they reject "From: support@…" if you logged in as another user.
 * Reply-To can still be SUPPORT_EMAIL in the route options.
 */
export function defaultFromOverride(mail: ReturnType<typeof getMailRuntimeEnv>): string {
  const mailbox = mail.smtpUser || mail.supportEmail;
  return `${mail.siteName} <${mailbox}>`;
}
