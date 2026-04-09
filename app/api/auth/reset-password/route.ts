import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || typeof token !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.usedAt ||
      new Date(record.expiresAt) < new Date()
    ) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ 1. Update password
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    // ✅ 2. Mark this token as used
    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // ✅ 3. DELETE ALL OTHER TOKENS (add this here)
    await prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}