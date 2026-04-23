import { prisma } from "@/lib/db";
import { getSentQuoteRecipientEmails } from "@/lib/admin/quoteSentRecipients";

/**
 * Registered clients who have at least one submitted 1701A evaluation row and
 * were not already sent a quote email successfully (tracked in `quote_sent_recipient_emails_v1`).
 *
 * Re-submitting the 1701A evaluation clears that flag so the client appears here again.
 *
 * Note: This intentionally does **not** use `getEligibleClientsAfterFilingNotifyRule`. That helper gates
 * filing-complete emails (and re-eligibility after a notify + paid resubmit). The quote picker should list
 * anyone who can receive a new quote send.
 */
export async function getSubmitted1701aClientOptions(): Promise<{
  email: string;
  fullName: string;
  lastQuoteSentAt: string | null;
}[]> {
  const sentRecipients = await getSentQuoteRecipientEmails();
  const users = await prisma.user.findMany({
    where: {
      evaluation1701ASubmissions: { some: {} },
    },
    select: {
      email: true,
      fullName: true,
      paymentQuotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
  });
  return users
    .map((u) => ({
      email: u.email.trim(),
      fullName: u.fullName.trim(),
      lastQuoteSentAt: u.paymentQuotes[0]?.createdAt?.toISOString() ?? null,
    }))
    .filter((u) => !sentRecipients.has(u.email.toLowerCase()));
}
