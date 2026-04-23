"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProcessorPayoutRequest } from "@/lib/processorPayoutRequests";

type Props = {
  role: "processor1" | "processor2";
  availableBalancePhp: number;
  withdrawnPhp: number;
  pendingPayoutPhp: number;
  requests?: ProcessorPayoutRequest[];
};

function formatPhp(n: number) {
  return `PHP ${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function formatWhen(v: string) {
  return new Date(v).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });
}

export function ProcessorPayoutRequestCard({
  role,
  availableBalancePhp,
  withdrawnPhp,
  pendingPayoutPhp,
  requests = [],
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const latest = useMemo(() => requests.slice(0, 6), [requests]);
  const hasPending = useMemo(() => requests.some((r) => r.status === "pending"), [requests]);

  useEffect(() => {
    if (!hasPending) return;
    let cancelled = false;
    const current = new Map(requests.map((r) => [r.id, r.status]));

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/${role}/payout-requests`, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });
          if (!res.ok) return;
          const j = (await res.json().catch(() => ({}))) as {
            rows?: Array<{ id: string; status: string }>;
          };
          if (cancelled || !Array.isArray(j.rows)) return;
          const changed = j.rows.some((row) => current.get(row.id) !== row.status);
          if (changed) {
            setOk(null);
            router.refresh();
          }
        } catch {
          // silent background sync
        }
      })();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasPending, requests, role, router]);

  async function onRequestPayout() {
    setErr(null);
    setOk(null);
    setPending(true);
    try {
      const res = await fetch(`/api/${role}/payout-requests`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.message === "string" ? j.message : "Could not request payout right now.");
        return;
      }
      setOk("Payout request sent. Processing may take up to 24 hours.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="adminCard incomePayoutCard">
      <h2 className="incomeBreakdownTitle">Balance and withdrawals</h2>
      <p className="muted adminBodyText" style={{ marginBottom: 14 }}>
        Use Request Payout to notify admin. Manual processing may take up to 24 hours.
      </p>
      <p className="muted" style={{ marginBottom: 14, fontSize: 12, lineHeight: 1.45 }}>
        Max per payout request: PHP 100.
      </p>
      <div className="incomeStatGrid" style={{ marginBottom: 12 }}>
        <article className="incomeStatCard">
          <p className="incomeStatEyebrow">Available balance</p>
          <p className="incomeStatValue">{formatPhp(availableBalancePhp)}</p>
        </article>
        <article className="incomeStatCard">
          <p className="incomeStatEyebrow">Pending withdrawals</p>
          <p className="incomeStatValue incomeStatValue--muted">{formatPhp(pendingPayoutPhp)}</p>
        </article>
        <article className="incomeStatCard">
          <p className="incomeStatEyebrow">Total withdrawn</p>
          <p className="incomeStatValue incomeStatValue--muted">{formatPhp(withdrawnPhp)}</p>
        </article>
      </div>
      <div className="adminActions">
        <button
          type="button"
          className="btn"
          onClick={() => void onRequestPayout()}
          disabled={pending || availableBalancePhp <= 0}
        >
          {pending ? "Submitting..." : "Request Payout"}
        </button>
      </div>
      {err ? <div className="adminNotice adminNotice--error" style={{ marginTop: 12 }}>{err}</div> : null}
      {ok ? (
        <div className="adminNotice adminNotice--success" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.4 }}>
          {ok}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#0f172a" }}>Recent withdrawal requests</h3>
        {latest.length === 0 ? (
          <p className="muted adminBodyText">No payout requests yet.</p>
        ) : (
          <div className="incomeTableWrap">
            <table className="incomeTable">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((r) => (
                  <tr key={r.id}>
                    <td>{formatWhen(r.requestedAt)}</td>
                    <td>{formatPhp(r.amountPhp)}</td>
                    <td style={{ textTransform: "capitalize" }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
