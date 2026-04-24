import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { customerHasPaidService, processAgentReferralPipeline } from "@/lib/agentReferralsSync";
import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";
import { queueScheduledEmail } from "@/lib/email/scheduledQueue";

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
    const tpl = await renderClientEmailTemplate("REGISTER_WELCOME", {
      fullName,
      siteName: config.siteName,
      loginUrl,
      email,
      supportEmail: config.supportEmail,
    });

    const next = new URL("/register/email-sent", req.url);
    next.searchParams.set("email", email);
    await queueScheduledEmail({
      type: "REGISTER_WELCOME",
      toEmail: email,
      subject: tpl.subject,
      body: tpl.textBody,
      userId: newUser.id,
      idempotencyKey: `register_welcome:${newUser.id}`,
    });
    return NextResponse.redirect(next, 303);
  } catch (err) {
    console.error("REGISTER_ERROR:", err);
    return NextResponse.redirect(new URL("/register?error=server", req.url), 303);
  }
}