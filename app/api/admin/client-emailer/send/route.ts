import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAdminCustomClientEmail } from "@/lib/email/adminCustomClientEmail";
import { sendMail } from "@/lib/email/mailer";

const Body = z.object({
  email: z.string().email(),
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

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { email: true, role: true },
  });
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const mail = buildAdminCustomClientEmail({ body: parsed.data.body });
  try {
    await sendMail(user.email, parsed.data.subject, mail.textBody, mail.htmlBody);
  } catch (err) {
    console.error("ADMIN_CUSTOM_CLIENT_EMAIL_SEND_FAILED:", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, to: user.email });
}
