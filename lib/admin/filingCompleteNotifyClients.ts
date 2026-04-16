import { getEligibleClientsAfterFilingNotifyRule } from "@/lib/admin/filingNotifyEligibility";

export type FilingCompleteNotifyClientRow = {
  email: string;
  fullName: string;
  lastFilingNotifySentAt: string | null;
};

/** Paid clients with a submitted 1701A, for filing-confirmation email picker (sorted by name). */
export async function getFilingCompleteNotifyClientRows(): Promise<FilingCompleteNotifyClientRow[]> {
  const users = await getEligibleClientsAfterFilingNotifyRule({ requirePaidBaseline: true });
  return users.map((u) => ({
    email: u.email,
    fullName: u.fullName,
    lastFilingNotifySentAt: u.lastFilingNotifySentAt?.toISOString() ?? null,
  }));
}
