import nodemailer from "nodemailer";

type SendMailResult = { messageId: string };

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

/**
 * Read SMTP from `process.env` at send time — not from `lib/config`.
 * `lib/config` is imported by client components (e.g. the site header); Next.js can then
 * omit non-`NEXT_PUBLIC_*` env values for that module graph, which would blank out SMTP on the server.
 */
function smtpEnv() {
  return {
    host: (process.env.SMTP_HOST || "").trim(),
    port: Number(process.env.SMTP_PORT || "587"),
    user: (process.env.SMTP_USER || "").trim(),
    pass: (process.env.SMTP_PASS || "").trim(),
    from: (process.env.SMTP_FROM || "").trim(),
  };
}

function mailFromDisplayDefaults() {
  return {
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance",
    supportEmail: (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim(),
  };
}

function hasSmtpConfig(): boolean {
  const s = smtpEnv();
  return Boolean(s.host && s.user && s.pass);
}

/** Exposed so API routes can tell “missing env” vs “provider rejected send” after a failure. */
export function isSmtpEnvConfigured(): boolean {
  return hasSmtpConfig();
}

function createTransporter() {
  const s = smtpEnv();
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.port === 465,
    auth: { user: s.user, pass: s.pass },
  });
}

export type SendMailOptions = {
  replyTo?: string;
  /** If set, used as From instead of SMTP_FROM / support default */
  fromOverride?: string;
  /** Comma-separated addresses allowed by nodemailer */
  bcc?: string;
  attachments?: MailAttachment[];
};

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  opts?: SendMailOptions
): Promise<SendMailResult> {
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV !== "production") {
      // Dev-safe: do not crash local flows when SMTP is not configured.
      console.log("[MAIL DEV MODE]", {
        to,
        subject,
        text,
        html,
        replyTo: opts?.replyTo,
        attachments: opts?.attachments?.map((a) => a.filename),
      });
      return { messageId: "DEV_LOG_ONLY" };
    }

    // Production-safe: fail fast with a clear configuration error.
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  const transporter = createTransporter();

  const s = smtpEnv();
  const d = mailFromDisplayDefaults();
  const from =
    opts?.fromOverride?.trim() || (s.from ? s.from : `${d.siteName} <${d.supportEmail}>`);

  const attachmentPayload =
    opts?.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      contentType: a.contentType ?? "application/octet-stream",
    })) ?? [];

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    ...(opts?.replyTo ? { replyTo: opts.replyTo } : {}),
    ...(opts?.bcc ? { bcc: opts.bcc } : {}),
    ...(attachmentPayload.length ? { attachments: attachmentPayload } : {}),
  });

  return { messageId: info.messageId };
}

export async function sendMailWithAttachments(
  to: string,
  subject: string,
  text: string,
  attachments: MailAttachment[],
  html?: string
): Promise<SendMailResult> {
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[MAIL DEV MODE attach]", {
        to,
        subject,
        text,
        html,
        files: attachments.map((a) => a.filename),
      });
      return { messageId: "DEV_LOG_ONLY" };
    }
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  const transporter = createTransporter();

  const s = smtpEnv();
  const d = mailFromDisplayDefaults();
  const info = await transporter.sendMail({
    from: s.from || d.supportEmail,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      contentType: a.contentType ?? "application/octet-stream",
    })),
  });

  return { messageId: info.messageId };
}