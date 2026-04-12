import { SESSION_SECRET } from "./sessionSecret";

function normalizeSiteBaseUrl(): string {
  const raw = (process.env.SITE_BASE_URL || "http://localhost:3000").trim();
  const noTrail = raw.replace(/\/+$/, "");
  return noTrail || "http://localhost:3000";
}

export const config = {
  /** Legal / SEO brand (search titles use this first). */
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || "FileRight Solutions",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance",
  supportEmail: process.env.SUPPORT_EMAIL || "support@filerightsolutions.com",
  /**
   * When true, sends a PDF copy of each 1701A submit to evaluationPdfNotifyEmail.
   * Default off so production does not spam an inbox on every submission.
   */
  evaluationSubmitNotifyAdmin:
    process.env.EVALUATION_SUBMIT_NOTIFY_ADMIN === "true" ||
    process.env.EVALUATION_SUBMIT_NOTIFY_ADMIN === "1",
  /** Recipient for admin PDF notifications when evaluationSubmitNotifyAdmin is true. */
  evaluationPdfNotifyEmail: (process.env.EVALUATION_PDF_NOTIFY_EMAIL || "").trim(),
  /** Canonical public site URL (no trailing slash). Used in emails, payment links, redirects. */
  baseUrl: normalizeSiteBaseUrl(),
  adminEmail: process.env.ADMIN_EMAIL || "admin@yourdomain.com",
  adminPassword: process.env.ADMIN_PASSWORD || "change_me",
  sessionSecret: SESSION_SECRET,
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
    /** Optional BCC on outgoing mail (e.g. your inbox) to confirm the server accepted the message. */
    bcc: (process.env.SMTP_BCC || "").trim(),
  },
  dragonpay: {
    merchantId: process.env.DRAGONPAY_MERCHANT_ID || "",
    secret: process.env.DRAGONPAY_SECRET || ""
  },
  paymongo: {
    secretKey: process.env.PAYMONGO_SECRET_KEY || "",
    publicKey: process.env.PAYMONGO_PUBLIC_KEY || "",
    webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || "",
    paymentMethodTypes: (process.env.PAYMONGO_PAYMENT_METHOD_TYPES || "qrph,gcash,paymaya")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
  /** Per confirmed referral credit: this % off the quoted fee (stacked; one credit per referred user). */
  referralFeeReductionPercent: Number(process.env.REFERRAL_FEE_REDUCTION_PERCENT || "10"),
  /** Minimum amount to charge after discounts (PHP). */
  minQuotedPaymentPhp: Number(process.env.MIN_QUOTED_PAYMENT_PHP || "1")
};