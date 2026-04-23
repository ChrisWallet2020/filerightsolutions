import { redirect } from "next/navigation";
import { getProcessor2SessionInfo, isProcessor2Authed } from "@/lib/auth";
import { getProcessor2Credentials, getProcessor2PayoutDetails } from "@/lib/siteSettings";
import { getProcessorIncomePricing } from "@/lib/processorIncomePricing";
import { fetchProcessorLedgerSummary } from "@/lib/processorCompensationLedger";
import { listProcessorPayoutRequests, payoutBreakdown } from "@/lib/processorPayoutRequests";
import { ProcessorIncomeTrackerView } from "@/components/income/ProcessorIncomeTrackerView";

export const dynamic = "force-dynamic";

export default async function Processor2IncomeTrackerPage() {
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) redirect("/processor2_dashboard/login");
  const session = getProcessor2SessionInfo();
  const actorKey = session?.actorKey || "processor2";

  const [pricing, summary, payoutDetails, payoutRequests] = await Promise.all([
    getProcessorIncomePricing(),
    fetchProcessorLedgerSummary("processor2", actorKey),
    getProcessor2PayoutDetails(),
    listProcessorPayoutRequests("processor2", actorKey),
  ]);
  const { approvedPhp, pendingPhp } = payoutBreakdown(payoutRequests);
  const availableBalancePhp = Math.max(0, summary.allGrand - approvedPhp - pendingPhp);

  return (
    <section className="section">
      <ProcessorIncomeTrackerView
        role="processor2"
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
