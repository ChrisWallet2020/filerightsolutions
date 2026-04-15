import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { buildAdminCustomClientEmail } from "@/lib/email/adminCustomClientEmail";
import { sendMail } from "@/lib/email/mailer";
import { defaultFromOverride, getMailRuntimeEnv } from "@/lib/mailRuntimeEnv";

const Body = z.object({
  email: z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .pipe(z.string().email()),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(12000),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const mail = buildAdminCustomClientEmail({ body: parsed.data.body });
  const to = parsed.data.email;
  const mailEnv = getMailRuntimeEnv();
  try {
    const result = await sendMail(to, parsed.data.subject, mail.textBody, mail.htmlBody, {
      replyTo: mailEnv.supportEmail,
      ...(mailEnv.smtpBcc ? { bcc: mailEnv.smtpBcc } : {}),
      ...(!mailEnv.smtpFrom ? { fromOverride: defaultFromOverride(mailEnv) } : {}),
    });
    if (result.messageId === "DEV_LOG_ONLY") {
      return NextResponse.json(
        { ok: true, to, messageId: result.messageId, devLogOnly: true },
        { status: 200 }
      );
    }
    console.info("ADMIN_CUSTOM_CLIENT_EMAIL_OK", { to, messageId: result.messageId, bcc: Boolean(mailEnv.smtpBcc) });
  } catch (err) {
    console.error("ADMIN_CUSTOM_CLIENT_EMAIL_SEND_FAILED:", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, to });
}
