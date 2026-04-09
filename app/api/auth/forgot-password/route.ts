import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendMail } from "@/lib/email/mailer";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success (security)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    const resetUrl = `${config.baseUrl}/reset-password?token=${rawToken}`;

    await sendMail(
      user.email,
      "Reset your password",
      `
We received a request to reset your password.

Reset it here:
${resetUrl}

This link expires in 1 hour.

If you did not request this, you can ignore this email.
      `
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}