import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed, isProcessor2Authed } from "@/lib/auth";
import { findUserForFilingCompleteNotifyByEmail } from "@/lib/admin/findUserForFilingCompleteNotify";
import { buildFilingCompleteNotifyEmail, firstNameFromFullName } from "@/lib/email/filingCompleteNotifyEmail";
import { sendMail } from "@/lib/email/mailer";
import { smtpSendContext } from "@/lib/smtpSendContext";
import { getProcessor2Credentials } from "@/lib/siteSettings";

const Body = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const processor2 = await getProcessor2Credentials();
  if (!isAdminAuthed() && !isProcessor2Authed(processor2.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const user = await findUserForFilingCompleteNotifyByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "not_eligible" }, { status: 400 });
  }

  const firstName = firstNameFromFullName(user.fullName);
  const { subject, textBody, htmlBody } = buildFilingCompleteNotifyEmail(firstName);
  const mailCtx = smtpSendContext();
  const sentAt = new Date();

  try {
    await sendMail(user.email, subject, textBody, htmlBody, {
      ...(mailCtx.smtpBcc ? { bcc: mailCtx.smtpBcc } : {}),
      ...(!mailCtx.smtpFromEnv ? { fromOverride: mailCtx.fromOverrideWhenNoSmtpFrom } : {}),
    });
  } catch (e) {
    console.error("FILING_COMPLETE_NOTIFY_SEND_FAILED:", e);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  try {
    await prisma.filingCompleteNotifySend.create({
      data: { userId: user.id },
    });
  } catch (e) {
    console.error("FILING_COMPLETE_NOTIFY_LOG_FAILED:", e);
  }

  return NextResponse.json({ ok: true, to: user.email, lastSentAt: sentAt.toISOString() });
}
