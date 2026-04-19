import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendMail } from "@/lib/email/mailer";
import { config } from "@/lib/config";
import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import {
  emailParagraphHtml,
  emailSignatureHtml,
  emailSignatureText,
  escapeHtml,
  joinTextParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";

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
    const safeUrl = escapeHtml(resetUrl);

    const textBody = joinTextParagraphs([
      `Hello,`,
      `We received a request to reset the password for your account.`,
      `Reset your password using this link (valid for 1 hour):\n${resetUrl}`,
      `If you did not request a reset, you can ignore this email; your password will stay the same.`,
      emailSignatureText("Reiner"),
    ]);

    const htmlBody = wrapEmailMainHtml(
      [
        emailParagraphHtml("Hello,"),
        emailParagraphHtml("We received a request to reset the password for your account."),
        emailParagraphHtml(`<a href="${safeUrl}">Reset your password</a> (this link expires in 1 hour.)`),
        emailParagraphHtml(
          `If the button does not work, copy and paste this address into your browser:<br/><span style="word-break:break-all;font-size:14px;">${safeUrl}</span>`
        ),
        emailParagraphHtml(
          "If you did not request a reset, you can ignore this email; your password will stay the same."
        ),
        emailSignatureHtml("Reiner"),
      ].join(""),
      clientEmailBranding()
    );

    await sendMail(user.email, "Reset your password", textBody, htmlBody);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}