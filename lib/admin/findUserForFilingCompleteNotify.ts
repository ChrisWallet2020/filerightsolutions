import { getPaidUserIdSet } from "@/lib/admin/paidUserIds";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";

/** Eligible for filing-confirmation email: submitted 1701A and has a paid order. */
export async function findUserForFilingCompleteNotifyByEmail(email: string) {
  const user = await findUserWith1701aSubmissionByEmail(email);
  if (!user) return null;
  const paid = await getPaidUserIdSet();
  return paid.has(user.id) ? user : null;
}
