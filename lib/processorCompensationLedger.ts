import { prisma } from "@/lib/db";
import {
  getProcessor1SessionInfo,
  getProcessor2SessionInfo,
  isAdminAuthed,
  isProcessor1Authed,
  isProcessor2Authed,
} from "@/lib/auth";
import { getProcessorIncomePricing } from "@/lib/processorIncomePricing";
import { processorLegacyLedgerActorKey, type ProcessorRole } from "@/lib/processorUsers";

export const LEDGER_KIND_QUOTE_IMAGE = "QUOTE_IMAGE_UPLOAD";
export const LEDGER_KIND_FILING_EMAIL = "FILING_COMPLETE_EMAIL";

export type ProcessorCompensationRole = "processor1" | "processor2";
export type ProcessorCompensationActor = {
  workspaceRole: ProcessorCompensationRole;
  actorKey: string;
  userId: string | null;
};

/** Who should be paid: signed-in processor only (never admin, even on processor dashboards). */
export async function getProcessorCompensationActor(): Promise<ProcessorCompensationActor | null> {
  if (isAdminAuthed()) return null;
  if (isProcessor1Authed()) {
    const s = getProcessor1SessionInfo();
    if (s) return { workspaceRole: "processor1", actorKey: s.actorKey, userId: s.userId };
  }
  if (isProcessor2Authed()) {
    const s = getProcessor2SessionInfo();
    if (s) return { workspaceRole: "processor2", actorKey: s.actorKey, userId: s.userId };
  }
  return null;
}

/** One line per slot when a quote email is delivered with that slot’s image (see `sendBillingQuote`). */
export async function recordProcessorQuoteImageUpload(params: {
  processorActorKey: string;
  clientEmail: string;
  slot: number;
}): Promise<void> {
  const { quoteImageUploadPhp } = await getProcessorIncomePricing();
  await prisma.processorCompensationLedger.create({
    data: {
      processorRole: params.processorActorKey,
      kind: LEDGER_KIND_QUOTE_IMAGE,
      amountPhp: quoteImageUploadPhp,
      clientEmail: params.clientEmail.slice(0, 320),
      slot: params.slot,
    },
  });
}

export async function recordProcessor2FilingEmail(params: { targetUserId: string; processorActorKey: string }): Promise<void> {
  const { filingEmailPhp } = await getProcessorIncomePricing();
  await prisma.processorCompensationLedger.create({
    data: {
      processorRole: params.processorActorKey,
      kind: LEDGER_KIND_FILING_EMAIL,
      amountPhp: filingEmailPhp,
      targetUserId: params.targetUserId,
    },
  });
}

export type LedgerKindTotals = { count: number; sumPhp: number };

function roleWhere(role: ProcessorCompensationRole, actorKey?: string) {
  if (!actorKey || actorKey === role) {
    return { OR: [{ processorRole: role }, { processorRole: { startsWith: `${role}:` } }] };
  }
  const legacyKey = processorLegacyLedgerActorKey(role as ProcessorRole);
  if (actorKey === legacyKey) {
    return {
      OR: [
        { processorRole: legacyKey },
        // Quote sends before canonical legacy key credited bare `processor1` / `processor2`.
        { processorRole: role },
      ],
    };
  }
  return { processorRole: actorKey };
}

export async function fetchProcessorLedgerSummary(role: ProcessorCompensationRole, actorKey?: string) {
  const now = new Date();
  const startOfUtcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const whereAll = roleWhere(role, actorKey);

  const [rows, monthTotals, allTotals] = await Promise.all([
    prisma.processorCompensationLedger.findMany({
      where: whereAll,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.processorCompensationLedger.groupBy({
      by: ["kind"],
      where: { ...whereAll, createdAt: { gte: startOfUtcMonth } },
      _sum: { amountPhp: true },
      _count: { _all: true },
    }),
    prisma.processorCompensationLedger.groupBy({
      by: ["kind"],
      where: whereAll,
      _sum: { amountPhp: true },
      _count: { _all: true },
    }),
  ]);

  function fold(groups: typeof monthTotals): Record<string, LedgerKindTotals> {
    const out: Record<string, LedgerKindTotals> = {};
    for (const g of groups) {
      out[g.kind] = { count: g._count._all, sumPhp: g._sum.amountPhp ?? 0 };
    }
    return out;
  }

  const monthByKind = fold(monthTotals);
  const allByKind = fold(allTotals);
  const monthGrand = monthTotals.reduce((a, m) => a + (m._sum.amountPhp ?? 0), 0);
  const allGrand = allTotals.reduce((a, m) => a + (m._sum.amountPhp ?? 0), 0);

  const filingUserIds = rows
    .filter((r) => r.kind === LEDGER_KIND_FILING_EMAIL && r.targetUserId)
    .map((r) => r.targetUserId as string);
  const uniqueFilingIds = [...new Set(filingUserIds)];
  const filingUsers =
    uniqueFilingIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uniqueFilingIds } },
          select: { id: true, email: true },
        })
      : [];
  const filingRecipientEmail: Record<string, string> = Object.fromEntries(
    filingUsers.map((u) => [u.id, u.email]),
  );

  return { rows, monthByKind, allByKind, monthGrand, allGrand, startOfUtcMonth, filingRecipientEmail };
}

export type ProcessorLedgerSummary = Awaited<ReturnType<typeof fetchProcessorLedgerSummary>>;
