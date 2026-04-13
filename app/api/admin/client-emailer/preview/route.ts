import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAdminCustomClientEmail } from "@/lib/email/adminCustomClientEmail";

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
    select: { email: true, fullName: true, role: true },
  });
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const mail = buildAdminCustomClientEmail({ body: parsed.data.body });
  return NextResponse.json({
    ok: true,
    subject: parsed.data.subject,
    email: user.email,
    clientFullName: user.fullName,
    text: mail.textBody,
    html: mail.htmlBody,
  });
}
