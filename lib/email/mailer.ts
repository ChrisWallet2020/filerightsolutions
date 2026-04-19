import { Resend } from "resend";
import { resolveMailReplyTo } from "./mailReplyTo";

type SendMailResult = { messageId: string };

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

function resendEnv() {
  return {
    apiKey: (process.env.RESEND_API_KEY || "").trim(),
  };
}

function mailFromDisplayDefaults() {
  return {
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance",
    supportEmail: (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim(),
  };
}

function hasResendConfig(): boolean {
  return Boolean(resendEnv().apiKey);
}

/** After a failed send: true if credentials exist (provider likely rejected), false if env missing. */
export function isMailEnvConfigured(): boolean {
  return hasResendConfig();
}
/** Backward-compat alias while callsites migrate naming. */
export const isSmtpEnvConfigured = isMailEnvConfigured;

export type MailHealthStatus = {
  provider: "resend";
  configured: boolean;
  /** True when `RESEND_API_KEY` is set (kept for existing `/api/admin/email-health` consumers). */
  tokenOk: boolean;
  error?: string;
};

let resendSingleton: Resend | null = null;
function getResend(): Resend {
  const { apiKey } = resendEnv();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!resendSingleton) {
    resendSingleton = new Resend(apiKey);
  }
  return resendSingleton;
}

function resolveFromHeader(opts: SendMailOptions | undefined): string {
  const d = mailFromDisplayDefaults();
  const override = opts?.fromOverride?.trim();
  if (override) return override;
  const envFrom = (process.env.SMTP_FROM || process.env.RESEND_FROM || "").trim();
  if (envFrom) return envFrom;
  if (process.env.NODE_ENV !== "production") {
    return `${d.siteName} <onboarding@resend.dev>`;
  }
  return `${d.siteName} <${d.supportEmail}>`;
}

function csvToList(csv: string | undefined): string[] | undefined {
  const list = (csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

export async function getMailHealthStatus(): Promise<MailHealthStatus> {
  if (!hasResendConfig()) {
    return {
      provider: "resend",
      configured: false,
      tokenOk: false,
      error: "Missing RESEND_API_KEY.",
    };
  }
  return {
    provider: "resend",
    configured: true,
    tokenOk: true,
  };
}

async function sendViaResend(
  to: string,
  subject: string,
  text: string,
  html: string | undefined,
  opts: SendMailOptions | undefined
): Promise<SendMailResult> {
  const from = resolveFromHeader(opts);
  const replySource = resolveMailReplyTo(opts?.replyTo);
  const replyList = (csvToList(replySource) ?? [replySource]) as string | string[];
  const { data, error } = await getResend().emails.send({
    from,
    to,
    subject,
    ...(html ? { html, ...(text ? { text } : {}) } : { text }),
    replyTo: replyList,
    ...(opts?.bcc?.trim() ? { bcc: (csvToList(opts.bcc) ?? opts.bcc.trim()) as string | string[] } : {}),
    ...(opts?.attachments?.length
      ? {
          attachments: opts.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
            ...(a.contentType ? { contentType: a.contentType } : {}),
          })),
        }
      : {}),
  });
  if (error) {
    const detail =
      typeof (error as { message?: string }).message === "string"
        ? (error as { message: string }).message
        : JSON.stringify(error);
    throw new Error(`Resend send failed: ${detail}`);
  }
  return { messageId: data?.id || "RESEND_ACCEPTED" };
}

export type SendMailOptions = {
  replyTo?: string;
  /** If set, used as From instead of SMTP_FROM / RESEND_FROM / defaults. */
  fromOverride?: string;
  /** Comma-separated BCC addresses. */
  bcc?: string;
  attachments?: MailAttachment[];
  /** Allow auth/security emails to bypass global pause/suppression rules when required. */
  bypassPolicy?: boolean;
};

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  opts?: SendMailOptions
): Promise<SendMailResult> {
  if (!opts?.bypassPolicy) {
    const [{ isGlobalEmailPaused, isSuppressedEmail }] = await Promise.all([
      import("./policy"),
    ]);
    if (isGlobalEmailPaused()) {
      throw new Error("Email sending is globally paused (EMAIL_PAUSED_ALL=true).");
    }
    if (await isSuppressedEmail(to)) {
      throw new Error(`Recipient is suppressed: ${to}`);
    }
  }
  if (!hasResendConfig()) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[MAIL DEV MODE]", {
        to,
        subject,
        text,
        html,
        replyTo: resolveMailReplyTo(opts?.replyTo),
        attachments: opts?.attachments?.map((a) => a.filename),
      });
      return { messageId: "DEV_LOG_ONLY" };
    }

    throw new Error("Resend is not configured. Set RESEND_API_KEY (and SMTP_FROM or RESEND_FROM for production).");
  }
  return sendViaResend(to, subject, text, html, opts);
}

export async function sendMailWithAttachments(
  to: string,
  subject: string,
  text: string,
  attachments: MailAttachment[],
  html?: string
): Promise<SendMailResult> {
  const [{ isGlobalEmailPaused, isSuppressedEmail }] = await Promise.all([import("./policy")]);
  if (isGlobalEmailPaused()) {
    throw new Error("Email sending is globally paused (EMAIL_PAUSED_ALL=true).");
  }
  if (await isSuppressedEmail(to)) {
    throw new Error(`Recipient is suppressed: ${to}`);
  }
  if (!hasResendConfig()) {
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
    throw new Error("Resend is not configured. Set RESEND_API_KEY (and SMTP_FROM or RESEND_FROM for production).");
  }
  return sendViaResend(to, subject, text, html, { attachments });
}
