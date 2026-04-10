import nodemailer from "nodemailer";
import { config } from "../config";

type SendMailResult = { messageId: string };

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

function hasSmtpConfig(): boolean {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
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

  const from =
    opts?.fromOverride?.trim() ||
    (config.smtp.from && config.smtp.from.trim()) ||
    `${config.siteName} <${config.supportEmail}>`;

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
  attachments: MailAttachment[]
): Promise<SendMailResult> {
  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[MAIL DEV MODE attach]", {
        to,
        subject,
        text,
        files: attachments.map((a) => a.filename),
      });
      return { messageId: "DEV_LOG_ONLY" };
    }
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: config.smtp.from || config.supportEmail,
    to,
    subject,
    text,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      contentType: a.contentType ?? "application/octet-stream",
    })),
  });

  return { messageId: info.messageId };
}