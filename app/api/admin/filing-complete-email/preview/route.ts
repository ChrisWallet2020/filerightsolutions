import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed, isProcessor2Authed } from "@/lib/auth";
import { findUserForFilingCompleteNotifyByEmail } from "@/lib/admin/findUserForFilingCompleteNotify";
import { buildFilingCompleteNotifyEmail, firstNameFromFullName } from "@/lib/email/filingCompleteNotifyEmail";
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

  return NextResponse.json({
    ok: true,
    subject,
    email: user.email,
    firstName,
    text: textBody,
    html: htmlBody,
  });
}
