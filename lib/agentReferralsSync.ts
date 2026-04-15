import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { ORDER_STATUS } from "@/lib/constants";
import { scoreNameMatch, type NameMatchConfidence, normalizeNameTokens } from "@/lib/agentReferralNameMatch";

const RANK: Record<NameMatchConfidence, number> = {
  exact_norm: 3,
  ordered_tokens: 2,
  first_last: 1,
};

export async function customerHasPaidService(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return false;

  const viaQuote = await prisma.paymentQuote.findFirst({
    where: { userId, resultOrder: { status: ORDER_STATUS.PAID } },
    select: { id: true },
  });
  if (viaQuote) return true;

  const viaOrder = await prisma.order.findFirst({
    where: {
      status: ORDER_STATUS.PAID,
      customerEmail: { equals: user.email.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  return Boolean(viaOrder);
}

async function findBestCustomerMatch(nameEntered: string): Promise<{ userId: string; confidence: NameMatchConfidence } | null> {
  const inputTok = normalizeNameTokens(nameEntered);
  if (inputTok.length < 2) return null;

  const first = inputTok[0];
  const last = inputTok[inputTok.length - 1];

  const candidates = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      AND: [
        { fullName: { contains: first, mode: "insensitive" } },
        { fullName: { contains: last, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true },
    take: 120,
  });

  let bestRank = -1;
  const winners: { userId: string; confidence: NameMatchConfidence }[] = [];

  for (const c of candidates) {
    const conf = scoreNameMatch(nameEntered, c.fullName);
    if (!conf) continue;
    const rank = RANK[conf];
    if (rank > bestRank) {
      bestRank = rank;
      winners.length = 0;
      winners.push({ userId: c.id, confidence: conf });
    } else if (rank === bestRank) {
      winners.push({ userId: c.id, confidence: conf });
    }
  }

  if (winners.length !== 1 || bestRank < 0) return null;
  return winners[0];
}

/** Try to attach matched customer rows for submissions that have none yet. */
export async function runAgentReferralMatching(): Promise<number> {
  const pending = await prisma.agentReferralSubmission.findMany({
    where: { matchedUserId: null, payoutBlockedReason: null },
    select: { id: true, nameEntered: true, agentId: true },
    take: 200,
  });

  let n = 0;
  for (const row of pending) {
    const match = await findBestCustomerMatch(row.nameEntered);
    if (!match) continue;

    const priorSameClient = await prisma.agentReferralSubmission.findFirst({
      where: {
        agentId: row.agentId,
        matchedUserId: match.userId,
        id: { not: row.id },
      },
      select: { id: true },
    });

    if (priorSameClient) {
      await prisma.agentReferralSubmission.update({
        where: { id: row.id },
        data: {
          matchedUserId: match.userId,
          payoutBlockedReason: "duplicate_same_client",
          amountPhp: config.agentReferralPayoutPhp,
        },
      });
      n++;
      continue;
    }

    await prisma.agentReferralSubmission.update({
      where: { id: row.id },
      data: {
        matchedUserId: match.userId,
        amountPhp: config.agentReferralPayoutPhp,
      },
    });
    n++;

    if (await customerHasPaidService(match.userId)) {
      await prisma.agentReferralSubmission.update({
        where: { id: row.id },
        data: { paidDetectedAt: new Date() },
      });
    }
  }
  return n;
}

/** Mark paidDetectedAt for matched rows when the customer has paid. */
export async function runAgentReferralPaidSync(): Promise<number> {
  const rows = await prisma.agentReferralSubmission.findMany({
    where: {
      matchedUserId: { not: null },
      paidDetectedAt: null,
      payoutBlockedReason: null,
    },
    select: { id: true, matchedUserId: true },
    take: 300,
  });

  let n = 0;
  for (const r of rows) {
    if (!r.matchedUserId) continue;
    if (!(await customerHasPaidService(r.matchedUserId))) continue;
    await prisma.agentReferralSubmission.update({
      where: { id: r.id },
      data: { paidDetectedAt: new Date() },
    });
    n++;
  }
  return n;
}

function payoutDueAfter(submittedAt: Date): Date {
  const ms = config.agentReferralPayoutDelayHours * 60 * 60 * 1000;
  return new Date(submittedAt.getTime() + ms);
}

/** Complete ledger payouts when paid + delay elapsed. */
export async function runAgentReferralPayouts(): Promise<number> {
  const now = new Date();
  const pending = await prisma.agentReferralSubmission.findMany({
    where: {
      matchedUserId: { not: null },
      paidDetectedAt: { not: null },
      payoutCompletedAt: null,
      payoutBlockedReason: null,
    },
    select: { id: true, createdAt: true },
    take: 300,
  });

  let n = 0;
  for (const r of pending) {
    if (payoutDueAfter(r.createdAt) > now) continue;
    await prisma.agentReferralSubmission.update({
      where: { id: r.id },
      data: { payoutCompletedAt: now },
    });
    n++;
  }
  return n;
}

/** Call after an order transitions to PAID (webhooks). */
export async function syncAgentReferralsForPaidOrder(order: {
  id: string;
  customerEmail: string;
}): Promise<void> {
  const email = order.customerEmail.trim();
  if (!email) return;

  const users = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" }, role: "CUSTOMER" },
    select: { id: true },
  });

  const quoteUser = await prisma.paymentQuote.findFirst({
    where: { resultOrderDbId: order.id },
    select: { userId: true },
  });

  const ids = new Set<string>();
  for (const u of users) ids.add(u.id);
  if (quoteUser) ids.add(quoteUser.userId);

  if (ids.size === 0) return;

  const paidAt = new Date();
  await prisma.agentReferralSubmission.updateMany({
    where: {
      matchedUserId: { in: [...ids] },
      paidDetectedAt: null,
      payoutBlockedReason: null,
    },
    data: { paidDetectedAt: paidAt },
  });
}

export async function processAgentReferralPipeline(): Promise<{
  matched: number;
  paidSync: number;
  payouts: number;
}> {
  const matched = await runAgentReferralMatching();
  const paidSync = await runAgentReferralPaidSync();
  const payouts = await runAgentReferralPayouts();
  return { matched, paidSync, payouts };
}
