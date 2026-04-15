import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { getMailHealthStatus, sendMail } from "@/lib/email/mailer";
import { smtpSendContext } from "@/lib/smtpSendContext";

const TestSendSchema = z.object({
  to: z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .pipe(z.string().email()),
});

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const health = await getMailHealthStatus();
  return NextResponse.json({ ok: health.tokenOk, health }, { status: 200 });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = TestSendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const health = await getMailHealthStatus();
  if (!health.configured || !health.tokenOk) {
    return NextResponse.json({ error: "mail_not_ready", health }, { status: 503 });
  }

  const to = parsed.data.to;
  const ctx = smtpSendContext();
  const subject = "Email health check";
  const textBody = [
    "This is a test message from your Tax Filing website.",
    "It confirms that Microsoft Graph email sending is configured and reachable.",
    "",
    `Sent at: ${new Date().toISOString()}`,
  ].join("\n");
  const htmlBody =
    "<p>This is a test message from your Tax Filing website.</p>" +
    "<p>It confirms that Microsoft Graph email sending is configured and reachable.</p>" +
    `<p>Sent at: ${new Date().toISOString()}</p>`;

  try {
    const result = await sendMail(to, subject, textBody, htmlBody, {
      replyTo: ctx.supportEmail,
      ...(ctx.smtpBcc ? { bcc: ctx.smtpBcc } : {}),
      ...(!ctx.smtpFromEnv ? { fromOverride: ctx.fromOverrideWhenNoSmtpFrom } : {}),
    });
    return NextResponse.json(
      { ok: true, to, messageId: result.messageId, health },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "send_failed", details: message, health }, { status: 500 });
  }
}
