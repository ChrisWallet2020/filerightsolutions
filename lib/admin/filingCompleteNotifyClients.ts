import { prisma } from "@/lib/db";
import { getPaidUserIdSet } from "@/lib/admin/paidUserIds";

export type FilingCompleteNotifyClientRow = {
  email: string;
  fullName: string;
  lastFilingNotifySentAt: string | null;
};

/** Paid clients with a submitted 1701A, for filing-confirmation email picker (sorted by name). */
export async function getFilingCompleteNotifyClientRows(): Promise<FilingCompleteNotifyClientRow[]> {
  const paidIds = await getPaidUserIdSet();
  if (paidIds.size === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { in: [...paidIds] },
      evaluation1701ASubmissions: { some: {} },
    },
    select: {
      email: true,
      fullName: true,
      filingCompleteNotifySends: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true },
      },
    },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
  });

  return users.map((u) => ({
    email: u.email.trim(),
    fullName: u.fullName.trim(),
    lastFilingNotifySentAt: u.filingCompleteNotifySends[0]?.sentAt.toISOString() ?? null,
  }));
}
