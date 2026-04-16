import { getEligibleClientsAfterFilingNotifyRule } from "@/lib/admin/filingNotifyEligibility";

/** Unique registered clients who have at least one submitted 1701A evaluation (submission row). */
export async function getSubmitted1701aClientOptions(): Promise<{ email: string; fullName: string }[]> {
  const eligible = await getEligibleClientsAfterFilingNotifyRule({ requirePaidBaseline: false });
  return eligible
    .map((u) => ({ email: u.email, fullName: u.fullName }))
    .sort((a, b) => {
    const na = a.fullName.toLowerCase();
    const nb = b.fullName.toLowerCase();
    if (na !== nb) return na.localeCompare(nb);
    return a.email.localeCompare(b.email);
  });
}
