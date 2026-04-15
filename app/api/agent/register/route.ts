import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateUniqueAgentReferralLinkCode } from "@/lib/agentReferralLinkCode";
import { z, type ZodError } from "zod";

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
  return `${makeReferralCode()}${makeReferralCode()}`.slice(0, 10);
}

const Body = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().email({ message: "Enter a valid email address" }).max(120)
  ),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  password2: z.string().min(8, "Confirm password must be at least 8 characters").max(200),
});

function firstZodIssueMessage(err: ZodError) {
  const i = err.issues[0];
  if (!i) return "Please check all fields.";
  const path = i.path.length ? `${i.path.join(".")}: ` : "";
  return `${path}${i.message}`;
}

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", message: firstZodIssueMessage(parsed.error) },
        { status: 400 }
      );
    }
    const { fullName, email, password, password2 } = parsed.data;
    if (password !== password2) {
      return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
    }

    const em = email;
    const existing = await prisma.user.findUnique({ where: { email: em } });

    if (existing) {
      if (existing.role === "AGENT") {
        return NextResponse.json({ error: "email_taken" }, { status: 409 });
      }

      const passwordOk = await bcrypt.compare(password, existing.passwordHash);
      if (!passwordOk) {
        /* 400 (not 401) so browsers and intermediaries never treat this like an auth challenge. */
        return NextResponse.json({ error: "wrong_password_existing_account" }, { status: 400 });
      }

      if (existing.agentPortalEnabled) {
        if (!existing.agentReferralLinkCode) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { agentReferralLinkCode: await generateUniqueAgentReferralLinkCode() },
          });
        }
        return NextResponse.json({ ok: true, linkedExisting: true, alreadyEnabled: true });
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          agentPortalEnabled: true,
          ...(existing.agentReferralLinkCode
            ? {}
            : { agentReferralLinkCode: await generateUniqueAgentReferralLinkCode() }),
        },
      });

      return NextResponse.json({ ok: true, linkedExisting: true });
    }

    const referralCode = await generateUniqueReferralCode();
    const agentReferralLinkCode = await generateUniqueAgentReferralLinkCode();
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        fullName,
        email: em,
        passwordHash,
        referralCode,
        agentReferralLinkCode,
        role: "AGENT",
        agentPortalEnabled: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("AGENT_REGISTER_FAILED", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "server",
        message:
          msg.includes("agentPortalEnabled") || msg.includes("Unknown arg")
            ? "Database is out of date: run prisma migrate/db push and redeploy, then try again."
            : "Something went wrong. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
