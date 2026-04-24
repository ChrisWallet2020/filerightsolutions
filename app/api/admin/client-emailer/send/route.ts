import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { buildAdminCustomClientEmail } from "@/lib/email/adminCustomClientEmail";
import { queueScheduledEmail } from "@/lib/email/scheduledQueue";

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
  try {
    await queueScheduledEmail({
      type: "ADMIN_CUSTOM_CLIENT_EMAIL",
      toEmail: to,
      subject: parsed.data.subject,
      body: mail.textBody,
    });
    console.info("ADMIN_CUSTOM_CLIENT_EMAIL_QUEUED", { to });
  } catch (err) {
    console.error("ADMIN_CUSTOM_CLIENT_EMAIL_QUEUE_FAILED:", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, to, queued: true });
}
