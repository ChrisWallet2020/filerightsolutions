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
  return getSubmitted1701aClientOptionsByScope("admin");
}

export async function getSubmitted1701aClientOptionsByScope(
  scope: "admin" | "processor"
): Promise<{
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
      evaluation1701ASubmissions: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { id: true, createdAt: true },
      },
      paymentQuotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
  });
  const stagingByEmailAndSubmission = new Map<string, Map<number, { uploadedBy: string }>>();
  if (scope === "admin") {
    const emails = [...new Set(users.map((u) => u.email.trim().toLowerCase()).filter(Boolean))];
    const stagingRows = emails.length
      ? await prisma.paymentQuoteImageStaging.findMany({
          where: { clientEmail: { in: emails } },
          select: { clientEmail: true, submissionId: true, slot: true, uploadedBy: true },
        })
      : [];

    for (const row of stagingRows) {
      const key = `${row.clientEmail.trim().toLowerCase()}::${row.submissionId}`;
      const cur = stagingByEmailAndSubmission.get(key) ?? new Map<number, { uploadedBy: string }>();
      cur.set(row.slot, { uploadedBy: row.uploadedBy });
      stagingByEmailAndSubmission.set(key, cur);
    }
  }

  return users
    .map((u) => {
      const email = u.email.trim();
      const emailKey = email.toLowerCase();
      let eligibleForDropdown = true;
      if (scope === "admin") {
        const latestSubmission = u.evaluation1701ASubmissions[0] ?? null;
        const latestSubmissionId = latestSubmission?.id ?? null;
        const submissionScope = latestSubmissionId
          ? stagingByEmailAndSubmission.get(`${emailKey}::${latestSubmissionId}`)
          : null;
        const slot1 = submissionScope?.get(1);
        const slot2 = submissionScope?.get(2);
        const slot3 = submissionScope?.get(3);
        const slot4 = submissionScope?.get(4);
        const hasAllFourWithCorrectOwners = Boolean(
          slot1?.uploadedBy === "processor1" &&
            slot2?.uploadedBy === "processor1" &&
            slot3?.uploadedBy === "processor2" &&
            slot4?.uploadedBy === "processor2"
        );
        eligibleForDropdown = hasAllFourWithCorrectOwners;
      }
      return {
        email,
        fullName: u.fullName.trim(),
        lastQuoteSentAt: u.paymentQuotes[0]?.createdAt?.toISOString() ?? null,
        eligibleForDropdown,
      };
    })
    .filter((u) => !sentRecipients.has(u.email.toLowerCase()) && u.eligibleForDropdown)
    .map(({ eligibleForDropdown: _eligibleForDropdown, ...u }) => u);
}
