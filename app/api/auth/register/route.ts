import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { sendMail } from "@/lib/email/mailer";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BILLING_EMAIL_FOOTER_TEXT = [
  "—",
  "",
  "FileRight Solutions is operated by FileRight Document Facilitation Services",
  "DTI-Registered, Philippines",
  "",
  "This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.",
].join("\n");

function billingEmailFooterHtml(): string {
  return `<div style="margin-top:36px;padding-top:28px;border-top:1px solid #e2e8f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.65;color:#64748b;max-width:560px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 0 14px 0;">
        <div style="font-size:13px;font-weight:600;color:#334155;letter-spacing:0.02em;">FileRight Solutions</div>
        <div style="margin-top:6px;color:#475569;">Operated by <strong style="color:#1e293b;font-weight:600;">FileRight Document Facilitation Services</strong></div>
        <div style="margin-top:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">DTI-Registered · Philippines</div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 0 0 0;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
          This email and any attachments are confidential and intended solely for the recipient. If you received this in error, please notify us and delete this email immediately.
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

function makeReferralCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function generateUniqueReferralCode(): Promise<string> {
  let code = makeReferralCode();
  for (let i = 0; i < 20; i++) {
    const clash = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!clash) return code;
    code = makeReferralCode();
  }
  // Extremely unlikely fallback
  return `${makeReferralCode()}${makeReferralCode()}`.slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const fullName = String(form.get("fullName") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const password2 = String(form.get("password2") || "");
    const ref = String(form.get("ref") || "").trim().toUpperCase();

    if (!fullName || !email || password.length < 8 || password !== password2) {
      return NextResponse.redirect(new URL("/register?error=invalid", req.url));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.redirect(new URL("/login?error=exists", req.url));
    }

    const referralCode = await generateUniqueReferralCode();
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        referralCode,
      },
    });

    // Optional referral event
    let referralEventId: string | null = null;

    if (ref) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: ref },
      });

      if (referrer) {
        const evt = await prisma.referralEvent.create({
          data: {
            referrerId: referrer.id,
            referredUserId: newUser.id,
          },
        });
        referralEventId = evt.id;
      }
    }

    // Create a draft evaluation right away (so account page can show the form immediately)
    await prisma.evaluation.create({
      data: {
        userId: newUser.id,
        status: "DRAFT",
        ...(referralEventId ? { referralEventId } : {}),
      },
    });

    const loginUrl = `${String(config.baseUrl).replace(/\/$/, "")}/login`;
    const subject = "Welcome to FileRight Solutions - Account Created";
    const textBody = [
      `Hello ${fullName},`,
      ``,
      `Thank you for creating your account with ${config.siteName}.`,
      ``,
      `Your registration is complete. You may now sign in using the link below:`,
      loginUrl,
      ``,
      `Sign-in email: ${email}`,
      `Use the password you created during registration.`,
      ``,
      `If you did not create this account, you may safely ignore this message.`,
      ``,
      `Sincerely,`,
      `Reiner`,
      ``,
      `Questions? Reply to this message or contact ${config.supportEmail}.`,
      ``,
      BILLING_EMAIL_FOOTER_TEXT,
    ].join("\n");

    const htmlBody = `<p>Hello ${escapeHtml(fullName)},</p>
<p>Thank you for creating your account with <strong>${escapeHtml(config.siteName)}</strong>.</p>
<p>Your registration is complete. You may now sign in using the link below:</p>
<p><a href="${loginUrl}">Sign in to continue</a></p>
<p style="word-break:break-all;">Or copy this link: <a href="${loginUrl}">${escapeHtml(loginUrl)}</a></p>
<p>Sign in with <strong>${escapeHtml(email)}</strong> and the password you created during registration.</p>
<p>Sincerely,<br/>Reiner</p>
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#475569;">Questions? Reply to this message or contact <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#0f172a;font-weight:600;text-decoration:none;border-bottom:1px solid #cbd5e1;">${escapeHtml(config.supportEmail)}</a>.</p>
<p style="color:#64748b;font-size:13px;">If you did not create this account, you may safely ignore this message.</p>
${billingEmailFooterHtml()}`;

    const next = new URL("/register/email-sent", req.url);
    next.searchParams.set("email", email);
    try {
      await sendMail(email, subject, textBody, htmlBody);
    } catch (mailErr) {
      console.error("REGISTER_CONFIRM_EMAIL_FAILED:", mailErr);
      next.searchParams.set("mail", "failed");
    }

    return NextResponse.redirect(next, 303);
  } catch (err) {
    console.error("REGISTER_ERROR:", err);
    return NextResponse.redirect(new URL("/register?error=server", req.url));
  }
}