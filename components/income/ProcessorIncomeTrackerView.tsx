import type { ProcessorIncomePricing } from "@/lib/processorIncomePricing";
import {
  LEDGER_KIND_FILING_EMAIL,
  LEDGER_KIND_QUOTE_IMAGE,
  type ProcessorLedgerSummary,
} from "@/lib/processorCompensationLedger";
import { ProcessorPayoutDetailsCard } from "@/components/income/ProcessorPayoutDetailsCard";
import type { ProcessorPayoutDetails } from "@/lib/siteSettings";
import type { ProcessorPayoutRequest } from "@/lib/processorPayoutRequests";
import { ProcessorPayoutRequestCard } from "@/components/income/ProcessorPayoutRequestCard";

function formatPhp(n: number) {
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function formatWhen(d: Date) {
  return d.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });
}

function kindLabel(kind: string) {
  if (kind === LEDGER_KIND_QUOTE_IMAGE) return "Quote email image";
  if (kind === LEDGER_KIND_FILING_EMAIL) return "Filing email";
  return kind;
}

type Props = {
  role: "processor1" | "processor2";
  pricing: ProcessorIncomePricing;
  summary: ProcessorLedgerSummary;
  payoutDetails: ProcessorPayoutDetails;
  availableBalancePhp: number;
  withdrawnPhp: number;
  pendingPayoutPhp: number;
  payoutRequests: ProcessorPayoutRequest[];
};

export function ProcessorIncomeTrackerView({
  role,
  pricing,
  summary,
  payoutDetails,
  availableBalancePhp,
  withdrawnPhp,
  pendingPayoutPhp,
  payoutRequests,
}: Props) {
  const { monthByKind, allByKind, monthGrand, allGrand, rows, filingRecipientEmail } = summary;
  const imgMonth = monthByKind[LEDGER_KIND_QUOTE_IMAGE] ?? { count: 0, sumPhp: 0 };
  const imgAll = allByKind[LEDGER_KIND_QUOTE_IMAGE] ?? { count: 0, sumPhp: 0 };
  const mailMonth = monthByKind[LEDGER_KIND_FILING_EMAIL] ?? { count: 0, sumPhp: 0 };
  const mailAll = allByKind[LEDGER_KIND_FILING_EMAIL] ?? { count: 0, sumPhp: 0 };
  const workspaceLabel = role === "processor1" ? "Processor1" : "Processor2";

  return (
    <div className="incomeTracker">
      <header className="incomeTrackerHeader">
        <div>
          <h1 className="incomeTrackerTitle">Income tracker</h1>
          <p className="muted incomeTrackerSubtitle">
            {`${workspaceLabel}: your account earnings from quote images included in successfully sent billing quote emails${
              role === "processor2" ? " and filing-complete emails you send." : "."
            }`}
          </p>
        </div>
      </header>

      <section className="incomeTrackerRatesBanner">
        <div className="incomeTrackerRatesInner">
          <span className="incomeTrackerRatesLabel">Current admin rates</span>
          <div className="incomeTrackerRatesChips">
            <span className="incomeRateChip">
              Quote email image <strong>{formatPhp(pricing.quoteImageUploadPhp)}</strong>
            </span>
            {role === "processor2" ? (
              <span className="incomeRateChip">
                Filing email <strong>{formatPhp(pricing.filingEmailPhp)}</strong>
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="incomeStatGrid">
        <article className="incomeStatCard incomeStatCard--accent">
          <p className="incomeStatEyebrow">This month</p>
          <p className="incomeStatValue">{formatPhp(monthGrand)}</p>
          <p className="incomeStatHint">Current month total</p>
        </article>
        <article className="incomeStatCard">
          <p className="incomeStatEyebrow">All time</p>
          <p className="incomeStatValue incomeStatValue--muted">{formatPhp(allGrand)}</p>
          <p className="incomeStatHint">Running total of logged events</p>
        </article>
      </div>

      <div className="incomeBreakdownGrid">
        <section className="adminCard incomeBreakdownCard">
          <h2 className="incomeBreakdownTitle">Quote email images</h2>
          <dl className="incomeBreakdownDl">
            <div>
              <dt>This month</dt>
              <dd>
                {imgMonth.count} sent · {formatPhp(imgMonth.sumPhp)}
              </dd>
            </div>
            <div>
              <dt>All time</dt>
              <dd>
                {imgAll.count} sent · {formatPhp(imgAll.sumPhp)}
              </dd>
            </div>
          </dl>
          <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 13, lineHeight: 1.45 }}>
            Income is credited after image uploaded is verified.
          </p>
        </section>
        {role === "processor2" ? (
          <section className="adminCard incomeBreakdownCard">
            <h2 className="incomeBreakdownTitle">Filing emails</h2>
            <dl className="incomeBreakdownDl">
              <div>
                <dt>This month</dt>
                <dd>
                  {mailMonth.count} sent · {formatPhp(mailMonth.sumPhp)}
                </dd>
              </div>
              <div>
                <dt>All time</dt>
                <dd>
                  {mailAll.count} sent · {formatPhp(mailAll.sumPhp)}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>

      <ProcessorPayoutRequestCard
        role={role}
        availableBalancePhp={availableBalancePhp}
        withdrawnPhp={withdrawnPhp}
        pendingPayoutPhp={pendingPayoutPhp}
        requests={payoutRequests}
      />

      <ProcessorPayoutDetailsCard role={role} initialDetails={payoutDetails} />

      <section className="adminCard incomeActivityCard">
        <h2 className="incomeBreakdownTitle">Recent activity</h2>
        <p className="muted adminBodyText" style={{ marginBottom: 14 }}>
          Latest 100 logged events for your account.
        </p>
        {rows.length === 0 ? (
          <p className="muted adminBodyText">No compensation events yet.</p>
        ) : (
          <div className="incomeTableWrap">
            <table className="incomeTable">
              <thead>
                <tr>
                  <th>When (PH)</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatWhen(r.createdAt)}</td>
                    <td>{kindLabel(r.kind)}</td>
                    <td className="incomeTableAmount">{formatPhp(r.amountPhp)}</td>
                    <td className="incomeTableDetail">
                      {r.kind === LEDGER_KIND_QUOTE_IMAGE && r.clientEmail ? (
                        <>
                          {r.clientEmail}
                          {r.slot != null ? ` · slot ${r.slot}` : ""}
                        </>
                      ) : r.kind === LEDGER_KIND_FILING_EMAIL && r.targetUserId ? (
                        <>{filingRecipientEmail[r.targetUserId] ?? r.targetUserId}</>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
