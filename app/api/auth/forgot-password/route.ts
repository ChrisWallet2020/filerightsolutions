import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { config } from "@/lib/config";
import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";
import { queueScheduledEmail } from "@/lib/email/scheduledQueue";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
    const tpl = await renderClientEmailTemplate("PASSWORD_RESET", {
      resetUrl,
      supportEmail: config.supportEmail,
    });
    await queueScheduledEmail({
      type: "PASSWORD_RESET",
      toEmail: user.email,
      subject: tpl.subject,
      body: tpl.textBody,
      userId: user.id,
      idempotencyKey: `password_reset:${tokenHash}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}