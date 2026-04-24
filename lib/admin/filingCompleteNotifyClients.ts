import { getEligibleClientsAfterFilingNotifyRule } from "@/lib/admin/filingNotifyEligibility";
import { getPaidUserIdSet } from "@/lib/admin/paidUserIds";
import { prisma } from "@/lib/db";

export type FilingCompleteNotifyClientRow = {
  email: string;
  fullName: string;
  tin: string | null;
  lastFilingNotifySentAt: string | null;
};

function extractTinFromPayloadJson(payloadJson: string | null | undefined): string | null {
  if (!payloadJson) return null;
  try {
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
    const parts = [parsed.tin1, parsed.tin2, parsed.tin3, parsed.tin4]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0);
    if (parts.length > 0) return parts.join("-");
    const rawTin = typeof parsed.tin === "string" ? parsed.tin.trim() : "";
    return rawTin || null;
  } catch {
    return null;
  }
}

/** Paid clients with a submitted 1701A, for filing-confirmation email picker (sorted by name). */
export async function getFilingCompleteNotifyClientRows(): Promise<FilingCompleteNotifyClientRow[]> {
  const users = await getEligibleClientsAfterFilingNotifyRule({ requirePaidBaseline: true });
  const paidUserIds = await getPaidUserIdSet();
  const paidUsers = users.filter((u) => paidUserIds.has(u.id));
  const paidUserIdsList = paidUsers.map((u) => u.id);

  const latestSubmissions = paidUserIdsList.length
    ? await prisma.evaluation1701ASubmission.findMany({
        where: { userId: { in: paidUserIdsList } },
        orderBy: [{ createdAt: "desc" }],
        select: { userId: true, payloadJson: true },
      })
    : [];

  const tinByUserId = new Map<string, string | null>();
  for (const row of latestSubmissions) {
    if (tinByUserId.has(row.userId)) continue;
    tinByUserId.set(row.userId, extractTinFromPayloadJson(row.payloadJson));
  }

  return paidUsers.map((u) => ({
    email: u.email,
    fullName: u.fullName,
    tin: tinByUserId.get(u.id) ?? null,
    lastFilingNotifySentAt: u.lastFilingNotifySentAt?.toISOString() ?? null,
  }));
}
