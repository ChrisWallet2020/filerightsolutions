import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getScheduledQueueHealth } from "@/lib/email/scheduledEmailHealth";

function minsLabel(v: number | null): string {
  if (v === null) return "—";
  return `${v} min`;
}

export default async function AdminIndexPage() {
  if (!isAdminAuthed()) {
    redirect("/admin_dashboard/login");
  }
  const health = await getScheduledQueueHealth({ stuckAfterMinutes: 10 });
  return (
    <section className="section" style={{ maxWidth: 760 }}>
      <h1>Admin Dashboard</h1>
      <p className="muted adminPageIntro">
        Manage operations from the left navigation. For multi-employee processor teams, create individual logins in{" "}
        <code>Processor accounts</code>.
      </p>
      <div className="adminCard" style={{ marginTop: 16 }}>
        <h2>Email queue health</h2>
        <p className="muted adminBodyText">
          Watch for stuck pending emails (attempt count still zero after 10+ minutes) and stale dispatch heartbeat.
        </p>
        <div className="adminBodyText" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>Pending total: <strong>{health.pendingTotal}</strong></div>
          <div>Pending due now: <strong>{health.pendingDueNow}</strong></div>
          <div>Oldest due pending: <strong>{minsLabel(health.oldestPendingDueMinutes)}</strong></div>
          <div>Stuck zero-attempt (10m+): <strong>{health.stuckZeroAttemptCount}</strong></div>
          <div>Sent (24h): <strong>{health.sentLast24h}</strong></div>
          <div>Failed (24h): <strong>{health.failedLast24h}</strong></div>
          <div>Last dispatch run: <strong>{health.lastDispatchRunAt ?? "—"}</strong></div>
          <div>Last watchdog run: <strong>{health.lastWatchdogRunAt ?? "—"}</strong></div>
        </div>
      </div>
      <div className="adminCard" style={{ marginTop: 16 }}>
        <h2>Processor team setup</h2>
        <p className="muted adminBodyText">
          Add separate accounts for each employee so Processor1 and Processor2 income trackers are recorded per person.
        </p>
        <div className="adminActions" style={{ marginTop: 10 }}>
          <Link href="/admin_dashboard/processor-accounts" className="btn">
            Open processor accounts
          </Link>
        </div>
      </div>
    </section>
  );
}
