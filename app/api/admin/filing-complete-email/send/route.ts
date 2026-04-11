import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";
import { buildFilingCompleteNotifyEmail, firstNameFromFullName } from "@/lib/email/filingCompleteNotifyEmail";
import { sendMail } from "@/lib/email/mailer";

const Body = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const user = await findUserWith1701aSubmissionByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "not_submitted" }, { status: 400 });
  }

  const firstName = firstNameFromFullName(user.fullName);
  const { subject, textBody, htmlBody } = buildFilingCompleteNotifyEmail(firstName);

  try {
    await sendMail(user.email, subject, textBody, htmlBody);
  } catch (e) {
    console.error("FILING_COMPLETE_NOTIFY_SEND_FAILED:", e);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, to: user.email });
}
