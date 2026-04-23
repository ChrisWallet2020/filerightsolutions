import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { fetchProcessorLedgerSummary, type ProcessorCompensationRole } from "@/lib/processorCompensationLedger";
import { listProcessorPayoutRequests, payoutBreakdown } from "@/lib/processorPayoutRequests";
import { getProcessorIncomePricing } from "@/lib/processorIncomePricing";
import { listProcessorUsers } from "@/lib/processorUsers";

export const dynamic = "force-dynamic";

function formatPhp(n: number) {
  return `PHP ${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function roleLabel(role: ProcessorCompensationRole): string {
  return role === "processor1" ? "Processor1" : "Processor2";
}

function actorLabel(role: ProcessorCompensationRole, username: string): string {
  return `${roleLabel(role)} · ${username}`;
}

function payoutMethodLabel(v: string): string {
  if (v === "online_banking") return "Online banking";
  if (v === "e_wallet") return "E-wallet";
  return "—";
}

function formatWhen(v: string) {
  return new Date(v).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });
}

export default async function AdminIncomeTrackerPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");

  const saved = searchParams.saved === "1";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const rateSaved = searchParams.rateSaved === "1";
  const rateError = typeof searchParams.rateError === "string" ? searchParams.rateError : "";

  const [p1Users, p2Users, allRequests, pricing] = await Promise.all([
    listProcessorUsers("processor1"),
    listProcessorUsers("processor2"),
    listProcessorPayoutRequests(),
    getProcessorIncomePricing(),
  ]);

  const accountDefs = [
    ...p1Users.map((u) => ({ role: "processor1" as const, actorKey: `processor1:${u.id}`, username: u.username })),
    ...p2Users.map((u) => ({ role: "processor2" as const, actorKey: `processor2:${u.id}`, username: u.username })),
  ];

  const perAccount = await Promise.all(
    accountDefs.map(async (acct) => {
      const [summary, rows] = await Promise.all([
        fetchProcessorLedgerSummary(acct.role, acct.actorKey),
        listProcessorPayoutRequests(acct.role, acct.actorKey),
      ]);
      const { approvedPhp, pendingPhp } = payoutBreakdown(rows);
      return {
        ...acct,
        allGrand: summary.allGrand,
        monthGrand: summary.monthGrand,
        approvedPhp,
        pendingPhp,
        balancePhp: Math.max(0, summary.allGrand - approvedPhp - pendingPhp),
        rows,
      };
    }),
  );

  const roles = (["processor1", "processor2"] as const).map((role) => ({
    role,
    accounts: perAccount.filter((a) => a.role === role),
  }));
  const pendingNotifications = allRequests
    .filter((r) => r.status === "pending")
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return (
    <section className="section" style={{ maxWidth: 1080 }}>
      <h1>Income tracker</h1>
      <p className="muted adminPageIntro">
        Manage payout requests from Processor1 and Processor2, including balances, pending withdrawals, and completed
        payouts.
      </p>

      {saved ? (
        <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Payout request updated</strong>
          <p className="adminNoticeBody">Status saved successfully.</p>
        </div>
      ) : null}
      {rateSaved ? (
        <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Income rates saved</strong>
          <p className="adminNoticeBody">New rates apply to future ledger entries.</p>
        </div>
      ) : null}
      {error ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Update failed</strong>
          <p className="adminNoticeBody">
            {error === "missing" ? "Request could not be found." : "Invalid request payload."}
          </p>
        </div>
      ) : null}
      {rateError === "invalid" ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Invalid rates</strong>
          <p className="adminNoticeBody">Enter whole peso amounts (0 or greater).</p>
        </div>
      ) : null}

      <section className="adminCard" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Payout request notifications</h2>
        {pendingNotifications.length === 0 ? (
          <p className="muted adminBodyText">No pending payout requests right now.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pendingNotifications.map((r) => (
              <div key={r.id} className="adminNotice adminNotice--warn" style={{ padding: "10px 12px" }}>
                <p className="adminNoticeBody" style={{ margin: 0 }}>
                  <strong>{roleLabel(r.processorRole)}</strong> user <strong>{r.requesterUsername || "unknown"}</strong>{" "}
                  requested <strong>{formatPhp(r.amountPhp)}</strong> on <strong>{formatWhen(r.requestedAt)}</strong>.
                </p>
                <p className="adminNoticeBody" style={{ margin: "4px 0 0" }}>
                  {payoutMethodLabel(r.payoutMethod)} · {r.payoutProvider || "No provider"} ·{" "}
                  {r.payoutAccountNumber || "No account number"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="adminStack" style={{ marginTop: 18 }}>
        {roles.map((group) => (
          <section key={group.role} className="adminCard">
            <h2 style={{ marginBottom: 10 }}>{roleLabel(group.role)}</h2>
            {group.accounts.length < 1 ? (
              <p className="muted adminBodyText">No processor employee accounts yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {group.accounts.map((block) => (
                  <section key={block.actorKey} className="adminCard" style={{ border: "1px solid var(--line)" }}>
                    <h3 style={{ marginBottom: 10 }}>{actorLabel(group.role, block.username)}</h3>
                    <div className="incomeStatGrid" style={{ marginBottom: 12 }}>
                      <article className="incomeStatCard">
                        <p className="incomeStatEyebrow">This month earnings</p>
                        <p className="incomeStatValue">{formatPhp(block.monthGrand)}</p>
                      </article>
                      <article className="incomeStatCard">
                        <p className="incomeStatEyebrow">All time earnings</p>
                        <p className="incomeStatValue">{formatPhp(block.allGrand)}</p>
                      </article>
                      <article className="incomeStatCard">
                        <p className="incomeStatEyebrow">Pending withdrawals</p>
                        <p className="incomeStatValue">{formatPhp(block.pendingPhp)}</p>
                      </article>
                      <article className="incomeStatCard">
                        <p className="incomeStatEyebrow">Total withdrawn</p>
                        <p className="incomeStatValue">{formatPhp(block.approvedPhp)}</p>
                      </article>
                      <article className="incomeStatCard incomeStatCard--accent">
                        <p className="incomeStatEyebrow">Available balance</p>
                        <p className="incomeStatValue">{formatPhp(block.balancePhp)}</p>
                      </article>
                    </div>

                    {block.rows.length === 0 ? (
                      <p className="muted adminBodyText">No payout requests yet.</p>
                    ) : (
                      <div className="incomeTableWrap incomeTableWrap--adminIncome">
                        <table className="incomeTable">
                          <thead>
                            <tr>
                              <th>Requested</th>
                              <th>User</th>
                              <th>Amount</th>
                              <th>Payout details</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.slice(0, 30).map((r) => (
                              <tr key={r.id}>
                                <td>{formatWhen(r.requestedAt)}</td>
                                <td>{r.requesterUsername || "—"}</td>
                                <td>{formatPhp(r.amountPhp)}</td>
                                <td>
                                  {payoutMethodLabel(r.payoutMethod)}
                                  <br />
                                  <span className="muted">
                                    {r.payoutProvider || "No provider"} · {r.payoutAccountName || "No name"} ·{" "}
                                    {r.payoutAccountNumber || "No account number"}
                                  </span>
                                </td>
                                <td style={{ textTransform: "capitalize" }}>{r.status}</td>
                                <td>
                                  {r.status === "pending" ? (
                                    <form action="/api/admin/processor-payout-requests" method="post" className="adminActions">
                                      <input type="hidden" name="id" value={r.id} />
                                      <button type="submit" name="status" value="approved" className="btn btnSecondary">
                                        Approve
                                      </button>
                                      <button type="submit" name="status" value="rejected" className="btn btnSecondary">
                                        Reject
                                      </button>
                                    </form>
                                  ) : (
                                    <span className="muted">{r.processedAt ? formatWhen(r.processedAt) : "-"}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="adminCard incomeRatesCard" style={{ marginTop: 18 }}>
        <h2>Income rates</h2>
        <p className="muted adminBodyText" style={{ marginBottom: 12 }}>
          Manage processor compensation used by both Income tracker and payout balances.
        </p>
        <form action="/api/admin/processor-income-rates" method="post" className="form" style={{ display: "grid", gap: 16, maxWidth: 680 }}>
          <label className="adminLabel">
            <span>Per quote email image when a billing quote is sent (Processor1 and Processor2)</span>
            <div className="incomeRatesInputRow">
              <span className="incomeRatesPrefix" aria-hidden="true">
                ₱
              </span>
              <input
                name="quoteImageUploadPhp"
                type="number"
                min={0}
                step={1}
                defaultValue={pricing.quoteImageUploadPhp}
                className="incomeRatesInput"
              />
            </div>
          </label>

          <label className="adminLabel">
            <span>Per filing-complete email (Processor2 only)</span>
            <div className="incomeRatesInputRow">
              <span className="incomeRatesPrefix" aria-hidden="true">
                ₱
              </span>
              <input
                name="filingEmailPhp"
                type="number"
                min={0}
                step={1}
                defaultValue={pricing.filingEmailPhp}
                className="incomeRatesInput"
              />
            </div>
          </label>

          <div className="adminActions">
            <button type="submit" className="btn">
              Save rates
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
