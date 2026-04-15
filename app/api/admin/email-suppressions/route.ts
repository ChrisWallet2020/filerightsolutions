import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addSuppression } from "@/lib/email/policy";

const CreateSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  reason: z.string().trim().min(3).max(500),
});

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.emailSuppression.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await addSuppression(parsed.data.email, parsed.data.reason, "admin");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });
  await prisma.emailSuppression.updateMany({
    where: { email },
    data: { active: false, reason: "unsuppressed_by_admin" },
  });
  return NextResponse.json({ ok: true });
}
