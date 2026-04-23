import { prisma } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/constants";

export type FilingNotifyEligibilityRow = {
  id: string;
  email: string;
  fullName: string;
  latestSubmissionAt: Date | null;
  lastFilingNotifySentAt: Date | null;
};

type Options = {
  /**
   * If true, user must have at least one paid order by email to be eligible even before first filing email send.
   * Filing-email picker should set this true; billing picker can keep false.
   */
  requirePaidBaseline: boolean;
};

/** Shared eligibility rule for admin pickers after filing-complete notifications. */
export async function getEligibleClientsAfterFilingNotifyRule(
  opts: Options
): Promise<FilingNotifyEligibilityRow[]> {
  const users = await prisma.user.findMany({
    where: {
      evaluation1701ASubmissions: { some: {} },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      evaluation1701ASubmissions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { createdAt: true },
      },
      filingCompleteNotifySends: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true },
      },
    },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
  });

  const emails = [...new Set(users.map((u) => u.email.trim().toLowerCase()).filter(Boolean))];
  const paidOrders = emails.length
    ? await prisma.order.findMany({
        where: {
          status: ORDER_STATUS.PAID,
          paidAt: { not: null },
          OR: emails.map((e) => ({ customerEmail: { equals: e, mode: "insensitive" as const } })),
        },
        select: { customerEmail: true, paidAt: true },
      })
    : [];

  const latestPaidAtByEmail = new Map<string, Date>();
  for (const o of paidOrders) {
    if (!o.paidAt) continue;
    const k = o.customerEmail.trim().toLowerCase();
    const prev = latestPaidAtByEmail.get(k);
    if (!prev || o.paidAt > prev) latestPaidAtByEmail.set(k, o.paidAt);
  }

  const out: FilingNotifyEligibilityRow[] = [];
  for (const u of users) {
    const email = u.email.trim();
    const key = email.toLowerCase();
    const fullName = u.fullName.trim();
    const latestSubmissionAt = u.evaluation1701ASubmissions[0]?.createdAt ?? null;
    const lastFilingNotifySentAt = u.filingCompleteNotifySends[0]?.sentAt ?? null;
    const latestPaidAt = latestPaidAtByEmail.get(key) ?? null;

    // Optional baseline paid requirement (used by filing-email picker).
    if (opts.requirePaidBaseline && !latestPaidAt) continue;

    // No filing-notify send yet => eligible.
    if (!lastFilingNotifySentAt) {
      out.push({ id: u.id, email, fullName, latestSubmissionAt, lastFilingNotifySentAt });
      continue;
    }

    // If already notified: only re-eligible when there is a newer submission AND that newer submission is paid.
    if (!latestSubmissionAt || latestSubmissionAt <= lastFilingNotifySentAt) continue;
    if (!latestPaidAt || latestPaidAt < latestSubmissionAt) continue;

    out.push({ id: u.id, email, fullName, latestSubmissionAt, lastFilingNotifySentAt });
  }

  return out;
}

