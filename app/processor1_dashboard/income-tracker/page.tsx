import { redirect } from "next/navigation";
import { getProcessor1SessionInfo, isProcessor1Authed } from "@/lib/auth";
import { getProcessor1Credentials, getProcessor1PayoutDetails } from "@/lib/siteSettings";
import { getProcessorIncomePricing } from "@/lib/processorIncomePricing";
import { fetchProcessorLedgerSummary } from "@/lib/processorCompensationLedger";
import { listProcessorPayoutRequests, payoutBreakdown } from "@/lib/processorPayoutRequests";
import { ProcessorIncomeTrackerView } from "@/components/income/ProcessorIncomeTrackerView";

export const dynamic = "force-dynamic";

export default async function Processor1IncomeTrackerPage() {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) redirect("/processor1_dashboard/login");
  const session = getProcessor1SessionInfo();
  const actorKey = session?.actorKey || "processor1";

  const [pricing, summary, payoutDetails, payoutRequests] = await Promise.all([
    getProcessorIncomePricing(),
    fetchProcessorLedgerSummary("processor1", actorKey),
    getProcessor1PayoutDetails(actorKey),
    listProcessorPayoutRequests("processor1", actorKey),
  ]);
  const { approvedPhp, pendingPhp } = payoutBreakdown(payoutRequests);
  const availableBalancePhp = Math.max(0, summary.allGrand - approvedPhp - pendingPhp);

  return (
    <section className="section">
      <ProcessorIncomeTrackerView
        role="processor1"
        pricing={pricing}
        summary={summary}
        payoutDetails={payoutDetails}
        availableBalancePhp={availableBalancePhp}
        withdrawnPhp={approvedPhp}
        pendingPayoutPhp={pendingPhp}
        payoutRequests={payoutRequests}
      />
    </section>
  );
}
