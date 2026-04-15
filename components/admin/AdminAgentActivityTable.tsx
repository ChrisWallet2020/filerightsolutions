import type { AgentReferralAdminRow } from "@/lib/admin/agentReferralAdminRows";

export function AdminAgentActivityTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: AgentReferralAdminRow[];
}) {
  return (
    <>
      <h1>{title}</h1>
      <p className="muted adminPageIntro" style={{ maxWidth: 960 }}>
        {subtitle}
      </p>

      <div style={{ marginTop: 22, overflowX: "auto" }} className="table adminCard">
        <div
          className="tr th"
          style={{ gridTemplateColumns: "132px minmax(200px, 1.1fr) minmax(160px, 1fr) minmax(160px, 1fr) 118px 118px 88px" }}
        >
          <div>Submitted</div>
          <div>Agent</div>
          <div>Name entered</div>
          <div>Matched client</div>
          <div>Paid</div>
          <div>Payout done</div>
          <div>Amount</div>
        </div>
        {rows.length === 0 ? (
          <div className="tr" style={{ gridTemplateColumns: "1fr" }}>
            <div className="muted">No agent referral rows yet.</div>
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="tr"
              style={{
                gridTemplateColumns: "132px minmax(200px, 1.1fr) minmax(160px, 1fr) minmax(160px, 1fr) 118px 118px 88px",
                alignItems: "start",
              }}
            >
              <div style={{ fontSize: 13 }}>{r.createdAt.toLocaleString()}</div>
              <div>
                <strong>{r.agent.fullName}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.agent.email}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, color: "#334155" }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>GCash #:</span>{" "}
                    {r.agent.agentPayoutGcashNumber?.trim() ? r.agent.agentPayoutGcashNumber : "—"}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>GCash name:</span>{" "}
                    {r.agent.agentPayoutGcashAccountName?.trim() ? r.agent.agentPayoutGcashAccountName : "—"}
                  </div>
                </div>
              </div>
              <div>{r.nameEntered}</div>
              <div>
                {r.matchedUser ? (
                  <>
                    <strong>{r.matchedUser.fullName}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.matchedUser.email}
                    </div>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div style={{ fontSize: 13 }}>{r.paidDetectedAt ? r.paidDetectedAt.toLocaleString() : "—"}</div>
              <div style={{ fontSize: 13 }}>{r.payoutCompletedAt ? r.payoutCompletedAt.toLocaleString() : "—"}</div>
              <div>
                ₱{r.amountPhp}
                {r.payoutBlockedReason ? (
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {r.payoutBlockedReason}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
