"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  nameEntered: string;
  createdAt: string;
  matchedDisplayName: string | null;
  matchedEmail: string | null;
  paidDetectedAt: string | null;
  payoutCompletedAt: string | null;
  amountPhp: number;
  payoutBlockedReason: string | null;
  status: string;
};

type AgentDashTab = "dashboard" | "instructions" | "gcash";

const TAB_DEFS: { id: AgentDashTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "instructions", label: "Instructions" },
  { id: "gcash", label: "GCash for payouts" },
];

export function AgentDashboardClient({ initialReferralLink = "" }: { initialReferralLink?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [payoutPhp, setPayoutPhp] = useState(100);
  const [delayHours, setDelayHours] = useState(72);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashAccountName, setGcashAccountName] = useState("");
  const [payoutErr, setPayoutErr] = useState<string | null>(null);
  const [payoutOk, setPayoutOk] = useState<string | null>(null);
  const [payoutPending, setPayoutPending] = useState(false);
  const [referralLink, setReferralLink] = useState(() => initialReferralLink.trim());
  const [linkCopied, setLinkCopied] = useState(false);
  const [tab, setTab] = useState<AgentDashTab>("dashboard");

  const copyAgentReferralLink = useCallback(() => {
    if (!referralLink || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(referralLink).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2200);
    });
  }, [referralLink]);

  const load = useCallback(async () => {
    const [refRes, payRes] = await Promise.all([
      fetch("/api/agent/referrals", { credentials: "same-origin" }),
      fetch("/api/agent/payout-details", { credentials: "same-origin" }),
    ]);
    const j = await refRes.json().catch(() => ({}));
    if (!refRes.ok) {
      setErr("Could not load referrals.");
      return;
    }
    setErr(null);
    setRows(j.rows || []);
    setPayoutPhp(Number(j.payoutPhp) || 100);
    setDelayHours(Number(j.delayHours) || 72);
    setReferralLink((prev) => {
      const next = typeof j.referralLink === "string" ? j.referralLink.trim() : "";
      return next || prev;
    });

    const pj = await payRes.json().catch(() => ({}));
    if (payRes.ok && pj.ok) {
      setGcashNumber(String(pj.gcashNumber ?? ""));
      setGcashAccountName(String(pj.gcashAccountName ?? ""));
      setPayoutErr(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePayoutDetails(e: React.FormEvent) {
    e.preventDefault();
    setPayoutErr(null);
    setPayoutOk(null);
    setPayoutPending(true);
    try {
      const res = await fetch("/api/agent/payout-details", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gcashNumber, gcashAccountName }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayoutErr(typeof j.message === "string" ? j.message : "Could not save GCash details.");
        return;
      }
      setPayoutOk("Saved. Our office uses this for manual GCash payouts — nothing is sent automatically from this site.");
      await load();
    } finally {
      setPayoutPending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await fetch("/api/agent/referrals", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nameEntered: name.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          j.error === "need_two_name_parts"
            ? "Enter at least first and last name (two words or more)."
            : j.error === "invalid"
              ? "Check the name and try again."
              : "Could not save referral."
        );
        return;
      }
      setName("");
      await load();
    } finally {
      setPending(false);
    }
  }

  const completed = rows.filter((r) => r.payoutCompletedAt).length;
  const pendingPayout = rows.filter((r) => r.paidDetectedAt && !r.payoutCompletedAt && !r.payoutBlockedReason).length;

  /** Do not flash “Could not load referrals” over an empty dashboard (first load / edge session quirks). Still show real form errors. */
  const showReferralFormErr =
    err != null && !(err === "Could not load referrals." && rows.length === 0);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 28, fontWeight: 800, color: "var(--fg)" }}>Referral dashboard</h1>

      <div
        role="tablist"
        aria-label="Dashboard sections"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 22,
          padding: 6,
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 14,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        {TAB_DEFS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`agent-tab-${t.id}`}
              aria-controls={`agent-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              style={{
                flex: "1 1 auto",
                minWidth: 140,
                padding: "10px 14px",
                borderRadius: 10,
                border: active ? "1px solid #1e40af" : "1px solid transparent",
                background: active ? "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)" : "transparent",
                color: active ? "#1e3a8a" : "#64748b",
                fontWeight: active ? 700 : 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "instructions" ? (
        <div
          className="agentCard"
          role="tabpanel"
          id="agent-panel-instructions"
          aria-labelledby="agent-tab-instructions"
          style={{
            marginBottom: 22,
            padding: "24px 26px",
            background: "linear-gradient(165deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)",
            border: "1px solid var(--line)",
            borderLeft: "4px solid #1e40af",
            boxShadow: "0 2px 12px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Quick guide
          </div>
          <p style={{ margin: "12px 0 8px", fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, maxWidth: 720 }}>
            How referrals get recorded—and how you get credited.
          </p>
          <p className="muted" style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.65, maxWidth: 720 }}>
            Everything below ties to the <strong style={{ color: "#0f172a" }}>Dashboard</strong> tab: add names there,
            watch your stats, then use <strong style={{ color: "#0f172a" }}>GCash for payouts</strong> when you are ready
            to receive transfers.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Step 1 · Names
              </div>
              <h2 style={{ margin: "8px 0 10px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                Add each client’s full name
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                On the Dashboard, type the name the way you would say it out loud: <strong style={{ color: "#0f172a" }}>given name first</strong>, then{" "}
                <strong style={{ color: "#0f172a" }}>family name</strong>. Two words are fine if that is how you know
                them—we match carefully to the name on their account. Example: <strong style={{ color: "#0f172a" }}>Juan Dela Cruz</strong>.
              </p>
            </div>

            <div
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Optional · Referral link
              </div>
              <h2 style={{ margin: "8px 0 10px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                Optional: share your personal signup link
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                You do not have to use a link—typing names on the Dashboard is enough. If you prefer, copy your personal
                signup link from the <strong style={{ color: "#0f172a" }}>Dashboard</strong> tab and share it so new
                clients land on registration with your agent code in the URL. That path counts toward your agent stats
                after they sign up and pay.
              </p>
            </div>

            <div
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Step 2 · Incentive
              </div>
              <h2 style={{ margin: "8px 0 10px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                When you earn ₱{payoutPhp}
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                After we match your entry to a customer, the clock starts. You qualify when they{" "}
                <strong style={{ color: "#0f172a" }}>complete payment</strong> for tax filing assistance through us. Your
                totals on the Dashboard update as that happens.
              </p>
            </div>

            <div
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Step 3 · Timing
              </div>
              <h2 style={{ margin: "8px 0 10px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                What “payout ready” means here
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                This portal shows eligibility for you—it does not send cash by itself. Once payment is confirmed, status
                usually updates after at least <strong style={{ color: "#0f172a" }}>{delayHours} hours</strong> from when
                you submitted the name (see your table on the Dashboard).
              </p>
            </div>

            <div
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Step 4 · Quality
              </div>
              <h2 style={{ margin: "8px 0 10px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                Keep it accurate—save delays
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                Match spelling to how the client is known on file. The same client cannot earn two incentives for the
                same agent. Typos and duplicates slow things down; clean entries move fastest.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "gcash" ? (
        <div
          className="agentCard"
          role="tabpanel"
          id="agent-panel-gcash"
          aria-labelledby="agent-tab-gcash"
          style={{
            marginBottom: 22,
            padding: "24px 26px",
            background: "linear-gradient(165deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)",
            border: "1px solid var(--line)",
            borderLeft: "4px solid #1e40af",
            boxShadow: "0 2px 12px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Payout wallet
          </div>
          <p style={{ margin: "12px 0 8px", fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, maxWidth: 720 }}>
            GCash for payouts
          </p>
          <p className="muted" style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.65, maxWidth: 720 }}>
            Our office sends incentives <strong style={{ color: "#0f172a" }}>manually via GCash</strong>—nothing on this
            site triggers a transfer automatically. Use the <strong style={{ color: "#0f172a" }}>11-digit mobile number</strong>{" "}
            registered to your GCash wallet and the <strong style={{ color: "#0f172a" }}>account name</strong> exactly as
            it appears in the GCash app.
          </p>

          <div
            style={{
              padding: "18px 20px",
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #e2e8f0",
              maxWidth: 560,
            }}
          >
            <div
              className="muted"
              style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              Your details
            </div>
            <h2 style={{ margin: "8px 0 14px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
              Mobile number and registered name
            </h2>
            <form className="form" onSubmit={(ev) => void savePayoutDetails(ev)} style={{ maxWidth: 520 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 15, lineHeight: 1.5 }}>
                <strong style={{ fontWeight: 700, color: "#0f172a" }}>GCash mobile number</strong>
                <input
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  placeholder="Your Gcash number"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 15, lineHeight: 1.5 }}>
                <strong style={{ fontWeight: 700, color: "#0f172a" }}>Name on GCash</strong>
                <input
                  value={gcashAccountName}
                  onChange={(e) => setGcashAccountName(e.target.value)}
                  placeholder="As shown in your GCash profile"
                  autoComplete="name"
                />
              </label>
              <button type="submit" className="btn" disabled={payoutPending} style={{ marginTop: 4, fontWeight: 700 }}>
                {payoutPending ? "Saving…" : "Save GCash details"}
              </button>
            </form>
            {payoutErr ? (
              <div
                className="notice"
                style={{ marginTop: 16, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 14, lineHeight: 1.55 }}
              >
                {payoutErr}
              </div>
            ) : null}
            {payoutOk ? (
              <div
                className="notice"
                style={{ marginTop: 16, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534", fontSize: 14, lineHeight: 1.55 }}
              >
                {payoutOk}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "dashboard" ? (
        <div
          role="tabpanel"
          id="agent-panel-dashboard"
          aria-labelledby="agent-tab-dashboard"
          style={{ display: "flex", flexDirection: "column", gap: 22 }}
        >
          <div
            className="agentCard"
            style={{
              padding: "24px 26px",
              background: "linear-gradient(165deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)",
              border: "1px solid var(--line)",
              borderLeft: "4px solid #1e40af",
              boxShadow: "0 2px 12px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                fontWeight: 800,
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              Your personal signup link
            </div>
            <p style={{ margin: "12px 0 8px", fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, maxWidth: 720 }}>
              The people you know on a Job Order or Contract of Service deserve big tax reduction—send them here.
            </p>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 16,
                fontWeight: 800,
                color: "#14532d",
                lineHeight: 1.45,
                maxWidth: 720,
              }}
            >
              You earn <span style={{ fontSize: 18 }}>₱{payoutPhp}</span> for every successful referral—once they
              complete payment for tax filing assistance through us, that referral counts toward your incentive.
            </p>
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.65, maxWidth: 720 }}>
              One link, yours alone: when they register through it, we can credit your referrals accurately. You help
              friends save on lower tax obligations while remaining fully BIR compliant—we handle the filing so they can
              focus on the work that pays the bills.
            </p>
            {referralLink ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
                <div
                  style={{
                    flex: "1 1 min(100%, 320px)",
                    minWidth: 0,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#0f172a",
                    wordBreak: "break-all",
                  }}
                  aria-label="Your referral signup URL"
                >
                  {referralLink}
                </div>
                <button
                  type="button"
                  className="btn btnSecondary"
                  onClick={() => copyAgentReferralLink()}
                  style={{ alignSelf: "stretch", whiteSpace: "nowrap", fontWeight: 700 }}
                >
                  {linkCopied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
                Your link will appear here as soon as the dashboard finishes loading. If it stays blank, refresh the
                page or sign in again.
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <div className="agentCard" style={{ padding: "16px 18px" }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Total referrals
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", marginTop: 6 }}>{rows.length}</div>
        </div>
        <div className="agentCard" style={{ padding: "16px 18px" }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Payouts completed
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#15803d", marginTop: 6 }}>{completed}</div>
        </div>
        <div className="agentCard" style={{ padding: "16px 18px" }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Awaiting payout window
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#b45309", marginTop: 6 }}>{pendingPayout}</div>
        </div>
          </div>

          <div className="agentCard">
        <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "var(--fg)" }}>Add a referred client</h2>
        <form className="form" onSubmit={(ev) => void submit(ev)} style={{ maxWidth: 520 }}>
          <label>
            <strong>Client full name</strong>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Clara Reyes"
              autoComplete="name"
            />
          </label>
          <button type="submit" className="btn" disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Submit referral"}
          </button>
        </form>
        {showReferralFormErr ? (
          <div className="notice" style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
            {err}
          </div>
        ) : null}
          </div>

          {rows.length > 0 ? (
          <div className="agentCard">
        <h2 style={{ margin: "0 0 14px", fontSize: 18, color: "var(--fg)" }}>Names you submitted</h2>
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.55 }}>
          Each row shows the name you typed, when you sent it, and how it is progressing toward payout.
        </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "10px 8px" }}>Submitted</th>
                  <th style={{ padding: "10px 8px" }}>Name you entered</th>
                  <th style={{ padding: "10px 8px" }}>Matched client</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                  <th style={{ padding: "10px 8px" }}>Payout</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 8px", fontWeight: 600, color: "var(--fg)" }}>{r.nameEntered}</td>
                    <td style={{ padding: "10px 8px", color: "var(--muted)" }}>
                      {r.matchedDisplayName ? (
                        <>
                          {r.matchedDisplayName}
                          <div style={{ fontSize: 12 }}>{r.matchedEmail}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "10px 8px" }}>{r.status}</td>
                    <td style={{ padding: "10px 8px" }}>
                      {r.payoutCompletedAt ? (
                        <span style={{ color: "#15803d", fontWeight: 700 }}>₱{r.amountPhp}</span>
                      ) : r.payoutBlockedReason ? (
                        <span className="muted">—</span>
                      ) : (
                        <span className="muted">₱{r.amountPhp} pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
