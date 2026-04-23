import { getEligibleClientsAfterFilingNotifyRule } from "@/lib/admin/filingNotifyEligibility";
import { getPaidUserIdSet } from "@/lib/admin/paidUserIds";

export type FilingCompleteNotifyClientRow = {
  email: string;
  fullName: string;
  lastFilingNotifySentAt: string | null;
};

/** Paid clients with a submitted 1701A, for filing-confirmation email picker (sorted by name). */
export async function getFilingCompleteNotifyClientRows(): Promise<FilingCompleteNotifyClientRow[]> {
  const users = await getEligibleClientsAfterFilingNotifyRule({ requirePaidBaseline: true });
  const paidUserIds = await getPaidUserIdSet();
  return users
    .filter((u) => paidUserIds.has(u.id))
    .map((u) => ({
      email: u.email,
      fullName: u.fullName,
      lastFilingNotifySentAt: u.lastFilingNotifySentAt?.toISOString() ?? null,
    }));
}
