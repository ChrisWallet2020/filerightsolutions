import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { ensureAgentReferralSignupUrl } from "@/lib/ensureAgentReferralSignupUrl";
import { getAuthedAgentUserId } from "@/lib/auth";
import { processAgentReferralPipeline } from "@/lib/agentReferralsSync";

const PostBody = z.object({
  nameEntered: z.string().trim().min(3).max(200),
});

function statusLabel(row: {
  payoutBlockedReason: string | null;
  matchedUserId: string | null;
  paidDetectedAt: Date | null;
  payoutCompletedAt: Date | null;
  createdAt: Date;
}): string {
  if (row.payoutBlockedReason === "duplicate_same_client") return "Duplicate (no payout)";
  if (row.payoutCompletedAt) return "Payout completed";
  if (row.paidDetectedAt) {
    const due = new Date(row.createdAt.getTime() + config.agentReferralPayoutDelayHours * 3600 * 1000);
    if (due > new Date()) return "Paid — payout pending (72h window)";
    return "Eligible — processing payout";
  }
  if (row.matchedUserId) return "Matched — waiting for payment";
  return "Looking for name match";
}

export async function GET() {
  const agentId = await getAuthedAgentUserId();
  if (!agentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [rows, referralLink] = await Promise.all([
    prisma.agentReferralSubmission.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        matchedUser: { select: { fullName: true, email: true } },
      },
    }),
    ensureAgentReferralSignupUrl(agentId),
  ]);

  return NextResponse.json({
    ok: true,
    payoutPhp: config.agentReferralPayoutPhp,
    delayHours: config.agentReferralPayoutDelayHours,
    referralLink,
    rows: rows.map((r) => ({
      id: r.id,
      nameEntered: r.nameEntered,
      createdAt: r.createdAt.toISOString(),
      matchedDisplayName: r.matchedUser?.fullName ?? null,
      matchedEmail: r.matchedUser?.email ?? null,
      paidDetectedAt: r.paidDetectedAt?.toISOString() ?? null,
      payoutCompletedAt: r.payoutCompletedAt?.toISOString() ?? null,
      amountPhp: r.amountPhp,
      payoutBlockedReason: r.payoutBlockedReason,
      status: statusLabel(r),
    })),
  });
}

export async function POST(req: Request) {
  const agentId = await getAuthedAgentUserId();
  if (!agentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const tok = parsed.data.nameEntered.split(/\s+/).filter(Boolean);
  if (tok.length < 2) {
    return NextResponse.json({ error: "need_two_name_parts" }, { status: 400 });
  }

  await prisma.agentReferralSubmission.create({
    data: {
      agentId,
      nameEntered: parsed.data.nameEntered,
      amountPhp: config.agentReferralPayoutPhp,
    },
  });

  await processAgentReferralPipeline();

  return NextResponse.json({ ok: true });
}
