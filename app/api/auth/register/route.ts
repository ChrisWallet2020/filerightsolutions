import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { customerHasPaidService, processAgentReferralPipeline } from "@/lib/agentReferralsSync";
import { sendMail } from "@/lib/email/mailer";
import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import {
  BILLING_EMAIL_FOOTER_TEXT,
  billingEmailFooterHtml,
  emailParagraphHtml,
  emailSignatureHtml,
  emailSignatureText,
  escapeHtml,
  joinTextParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";

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
    const agentRef = String(form.get("agentRef") || "").trim().toUpperCase();

    if (!fullName || !email || password.length < 8 || password !== password2) {
      return NextResponse.redirect(new URL("/register?error=invalid", req.url), 303);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.redirect(new URL("/login?error=exists", req.url), 303);
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

    // Agent program link (`agentRef`): counts toward agent dashboard only. Does not create ReferralEvent (client friend-referral / payable credit uses `ref` + referralCode).
    if (agentRef) {
      const agent = await prisma.user.findFirst({
        where: {
          agentPortalEnabled: true,
          agentReferralLinkCode: agentRef,
        },
        select: { id: true },
      });

      if (agent && agent.id !== newUser.id) {
        const prior = await prisma.agentReferralSubmission.findFirst({
          where: { agentId: agent.id, matchedUserId: newUser.id },
          select: { id: true },
        });

        if (!prior) {
          const sub = await prisma.agentReferralSubmission.create({
            data: {
              agentId: agent.id,
              nameEntered: fullName,
              matchedUserId: newUser.id,
              amountPhp: config.agentReferralPayoutPhp,
            },
          });

          if (await customerHasPaidService(newUser.id)) {
            await prisma.agentReferralSubmission.update({
              where: { id: sub.id },
              data: { paidDetectedAt: new Date() },
            });
          }

          await processAgentReferralPipeline();
        }
      }
    }

    const loginUrl = `${String(config.baseUrl).replace(/\/$/, "")}/login`;
    const subject = "Welcome to FileRight Solutions - Account Created";
    const textBody = joinTextParagraphs([
      `Hello ${fullName},`,
      `Thank you for creating your account with ${config.siteName}.`,
      `Your registration is complete. You may now sign in using the link below:\n${loginUrl}`,
      `Sign-in email: ${email}\nUse the password you created during registration.`,
      `If you did not create this account, you may safely ignore this message.`,
      emailSignatureText("Reiner"),
      `Questions? Reply to this message or contact ${config.supportEmail}.`,
      BILLING_EMAIL_FOOTER_TEXT,
    ]);

    const safeLoginUrl = escapeHtml(loginUrl);
    const htmlBody = wrapEmailMainHtml(
      [
        emailParagraphHtml(`Hello ${escapeHtml(fullName)},`),
        emailParagraphHtml(
          `Thank you for creating your account with <strong>${escapeHtml(config.siteName)}</strong>.`
        ),
        emailParagraphHtml("Your registration is complete. You may now sign in using the link below:"),
        emailParagraphHtml(`<a href="${safeLoginUrl}">Sign in to continue</a>`),
        emailParagraphHtml(
          `Or copy this link: <a href="${safeLoginUrl}" style="word-break:break-all;">${safeLoginUrl}</a>`
        ),
        emailParagraphHtml(
          `Sign in with <strong>${escapeHtml(email)}</strong> and the password you created during registration.`
        ),
        emailSignatureHtml("Reiner"),
        `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.55;color:#475569;">Questions? Reply to this message or contact <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#1e40af;font-weight:600;text-decoration:none;border-bottom:1px solid #cbd5e1;">${escapeHtml(config.supportEmail)}</a>.</p>`,
        emailParagraphHtml(
          `<span style="color:#64748b;font-size:13px;">If you did not create this account, you may safely ignore this message.</span>`
        ),
        billingEmailFooterHtml(),
      ].join(""),
      clientEmailBranding()
    );

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
    return NextResponse.redirect(new URL("/register?error=server", req.url), 303);
  }
}