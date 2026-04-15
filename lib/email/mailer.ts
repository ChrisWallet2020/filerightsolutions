type SendMailResult = { messageId: string };

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

function graphEnv() {
  return {
    tenantId: (process.env.GRAPH_TENANT_ID || "").trim(),
    clientId: (process.env.GRAPH_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GRAPH_CLIENT_SECRET || "").trim(),
    senderUser: (process.env.GRAPH_SENDER_USER || "").trim(),
    from: (process.env.SMTP_FROM || "").trim(),
    saveToSentItems:
      (process.env.GRAPH_SAVE_TO_SENT_ITEMS || "true").trim().toLowerCase() !== "false",
  };
}

function mailFromDisplayDefaults() {
  return {
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || "Tax Filing Assistance",
    supportEmail: (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim(),
  };
}

function hasGraphConfig(): boolean {
  const g = graphEnv();
  return Boolean(g.tenantId && g.clientId && g.clientSecret && g.senderUser);
}

/** After a failed send: true if credentials exist (provider likely rejected), false if env missing. */
export function isSmtpEnvConfigured(): boolean {
  return hasGraphConfig();
}

export type MailHealthStatus = {
  provider: "microsoft-graph";
  configured: boolean;
  senderUser: string;
  tokenOk: boolean;
  error?: string;
};

type GraphTokenCache = { token: string; expiresAtMs: number };
let graphTokenCache: GraphTokenCache | null = null;

function parseAddressHeader(input: string): { address: string; name?: string } {
  const trimmed = input.trim();
  const m = trimmed.match(/^(.*?)<([^>]+)>$/);
  if (!m) return { address: trimmed };
  const name = m[1].trim().replace(/^"(.*)"$/, "$1");
  const address = m[2].trim();
  return name ? { address, name } : { address };
}

function toRecipientObjects(csv: string): Array<{ emailAddress: { address: string } }> {
  return csv
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  if (graphTokenCache && graphTokenCache.expiresAtMs > now + 30_000) {
    return graphTokenCache.token;
  }

  const g = graphEnv();
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(g.tenantId)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    client_id: g.clientId,
    client_secret: g.clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const tokenResp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const tokenData = (await tokenResp.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!tokenResp.ok || !tokenData.access_token) {
    throw new Error(
      `Graph token request failed (${tokenResp.status}): ${tokenData.error_description || "no_access_token"}`
    );
  }

  graphTokenCache = {
    token: tokenData.access_token,
    expiresAtMs: now + Math.max((tokenData.expires_in || 3600) - 120, 60) * 1000,
  };
  return graphTokenCache.token;
}

export async function getMailHealthStatus(): Promise<MailHealthStatus> {
  const g = graphEnv();
  if (!hasGraphConfig()) {
    return {
      provider: "microsoft-graph",
      configured: false,
      senderUser: g.senderUser,
      tokenOk: false,
      error:
        "Missing GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, or GRAPH_SENDER_USER.",
    };
  }
  try {
    await getGraphAccessToken();
    return {
      provider: "microsoft-graph",
      configured: true,
      senderUser: g.senderUser,
      tokenOk: true,
    };
  } catch (err) {
    return {
      provider: "microsoft-graph",
      configured: true,
      senderUser: g.senderUser,
      tokenOk: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function sendViaGraphApi(
  to: string,
  subject: string,
  text: string,
  html: string | undefined,
  opts: SendMailOptions | undefined
): Promise<SendMailResult> {
  const g = graphEnv();
  const d = mailFromDisplayDefaults();
  const defaultMailbox = g.senderUser || d.supportEmail;
  const fromRaw = opts?.fromOverride?.trim() || (g.from ? g.from : `${d.siteName} <${defaultMailbox}>`);
  const fromParsed = parseAddressHeader(fromRaw);

  const message = {
    subject,
    body: {
      contentType: html ? "HTML" : "Text",
      content: html || text,
    },
    toRecipients: toRecipientObjects(to),
    from: {
      emailAddress: {
        address: fromParsed.address,
        ...(fromParsed.name ? { name: fromParsed.name } : {}),
      },
    },
    ...(opts?.replyTo
      ? {
          replyTo: toRecipientObjects(opts.replyTo),
        }
      : {}),
    ...(opts?.bcc
      ? {
          bccRecipients: toRecipientObjects(opts.bcc),
        }
      : {}),
    ...(opts?.attachments?.length
      ? {
          attachments: opts.attachments.map((a) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.filename,
            contentType: a.contentType ?? "application/octet-stream",
            contentBytes: (
              Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content)
            ).toString("base64"),
          })),
        }
      : {}),
  };

  const accessToken = await getGraphAccessToken();
  const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(g.senderUser)}/sendMail`;
  const sendResp = await fetch(sendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      saveToSentItems: g.saveToSentItems,
    }),
  });

  if (!sendResp.ok) {
    const errorBody = await sendResp.text().catch(() => "");
    throw new Error(`Graph sendMail failed (${sendResp.status}): ${errorBody || "no_error_body"}`);
  }

  return { messageId: "GRAPH_ACCEPTED" };
}

export type SendMailOptions = {
  replyTo?: string;
  /** If set, used as From instead of SMTP_FROM / support default */
  fromOverride?: string;
  /** Comma-separated addresses allowed by nodemailer */
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
  if (!hasGraphConfig()) {
    if (process.env.NODE_ENV !== "production") {
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

    throw new Error(
      "Graph mail is not configured. Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_SENDER_USER."
    );
  }
  return sendViaGraphApi(to, subject, text, html, opts);
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
  if (!hasGraphConfig()) {
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
    throw new Error(
      "Graph mail is not configured. Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_SENDER_USER."
    );
  }
  return sendViaGraphApi(to, subject, text, html, { attachments });
}
