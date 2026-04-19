import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { isAdminAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FILING_TASK_STATUS, ORDER_STATUS } from "@/lib/constants";
import { ensureFilingTaskForPaidOrder } from "@/lib/filingTasks";

export const dynamic = "force-dynamic";

type QueueFilter = "all_open" | "ready" | "in_progress" | "on_hold" | "filed" | "overdue";
type FilingTaskWithOrder = Prisma.FilingTaskGetPayload<{ include: { order: true } }>;

function toDateText(v: Date | null | undefined): string {
  if (!v) return "—";
  return v.toLocaleString();
}

function isOverdue(dueAt: Date | null, status: string): boolean {
  if (!dueAt) return false;
  if (status === FILING_TASK_STATUS.FILED || status === FILING_TASK_STATUS.QC_DONE) return false;
  return dueAt.getTime() < Date.now();
}

export default async function AdminFilingQueuePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");

  const filter = (typeof searchParams?.filter === "string" ? searchParams.filter : "all_open") as QueueFilter;
  const taskError = typeof searchParams?.taskError === "string" ? searchParams.taskError : "";
  const taskOk = searchParams?.taskOk === "1";

  let tasks: FilingTaskWithOrder[] = [];
  try {
    // Backfill tasks for paid orders that predate this feature.
    const paidOrders = await prisma.order.findMany({
      where: { status: ORDER_STATUS.PAID },
      select: { id: true, paidAt: true },
    });
    for (const o of paidOrders) {
      await ensureFilingTaskForPaidOrder({ id: o.id, paidAt: o.paidAt });
    }

    tasks = await prisma.filingTask.findMany({
      include: {
        order: true,
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    return (
      <section className="section">
        <h1>Filing queue</h1>
        <div className="adminNotice adminNotice--warn" style={{ marginTop: 14, maxWidth: 760 }}>
          <strong className="adminNoticeTitle">Queue setup pending</strong>
          <p className="adminNoticeBody">
            Filing task tables are not ready yet on this environment. Run <code>npx prisma db push</code>, then restart
            the app server and refresh this page.
          </p>
        </div>
      </section>
    );
  }

  const filtered = tasks.filter((t) => {
    if (filter === "ready") return t.status === FILING_TASK_STATUS.READY_TO_FILE;
    if (filter === "in_progress") return t.status === FILING_TASK_STATUS.IN_PROGRESS;
    if (filter === "on_hold") return t.status === FILING_TASK_STATUS.ON_HOLD;
    if (filter === "filed") return t.status === FILING_TASK_STATUS.FILED || t.status === FILING_TASK_STATUS.QC_DONE;
    if (filter === "overdue") return isOverdue(t.dueAt, t.status);
    return t.status !== FILING_TASK_STATUS.FILED && t.status !== FILING_TASK_STATUS.QC_DONE;
  });

  const counts = {
    ready: tasks.filter((t) => t.status === FILING_TASK_STATUS.READY_TO_FILE).length,
    inProgress: tasks.filter((t) => t.status === FILING_TASK_STATUS.IN_PROGRESS).length,
    hold: tasks.filter((t) => t.status === FILING_TASK_STATUS.ON_HOLD).length,
    overdue: tasks.filter((t) => isOverdue(t.dueAt, t.status)).length,
    filed: tasks.filter((t) => t.status === FILING_TASK_STATUS.FILED || t.status === FILING_TASK_STATUS.QC_DONE).length,
  };

  const taskErrorMessage =
    taskError === "missing_filing_reference"
      ? "Filing reference is required before marking as FILED."
      : taskError === "order_not_found"
      ? "Order was not found."
      : taskError === "missing_order"
      ? "Order ID is required."
      : taskError
      ? "Task update failed."
      : "";

  return (
    <section className="section">
      <h1>Filing queue</h1>
      <p className="muted adminPageIntro">
        Tracks all paid clients through filing operations so no paid account is missed. Move each client from ready to
        in-progress, hold, filed, and optional QC done.
      </p>

      <div className="adminStack" style={{ maxWidth: 1100 }}>
        <div className="adminCard">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Summary label="Ready" value={counts.ready} />
            <Summary label="In progress" value={counts.inProgress} />
            <Summary label="On hold" value={counts.hold} />
            <Summary label="Overdue" value={counts.overdue} danger={counts.overdue > 0} />
            <Summary label="Filed / QC done" value={counts.filed} />
          </div>
        </div>

        {taskOk ? (
          <div className="adminNotice adminNotice--success">
            <strong className="adminNoticeTitle">Filing task updated</strong>
            <p className="adminNoticeBody">Queue status has been saved.</p>
          </div>
        ) : null}
        {taskErrorMessage ? (
          <div className="adminNotice adminNotice--error">
            <strong className="adminNoticeTitle">Update failed</strong>
            <p className="adminNoticeBody">{taskErrorMessage}</p>
          </div>
        ) : null}

        <div className="adminCard">
          <div className="adminActions" style={{ marginBottom: 10 }}>
            <FilterLink active={filter === "all_open"} href="/admin_dashboard/filing-queue?filter=all_open" label="All open" />
            <FilterLink active={filter === "ready"} href="/admin_dashboard/filing-queue?filter=ready" label="Ready" />
            <FilterLink active={filter === "in_progress"} href="/admin_dashboard/filing-queue?filter=in_progress" label="In progress" />
            <FilterLink active={filter === "on_hold"} href="/admin_dashboard/filing-queue?filter=on_hold" label="On hold" />
            <FilterLink active={filter === "overdue"} href="/admin_dashboard/filing-queue?filter=overdue" label="Overdue" />
            <FilterLink active={filter === "filed"} href="/admin_dashboard/filing-queue?filter=filed" label="Filed / QC done" />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "10px 8px" }}>Order</th>
                  <th style={{ padding: "10px 8px" }}>Client</th>
                  <th style={{ padding: "10px 8px" }}>Task status</th>
                  <th style={{ padding: "10px 8px" }}>Assignee</th>
                  <th style={{ padding: "10px 8px" }}>Due</th>
                  <th style={{ padding: "10px 8px" }}>Filed ref</th>
                  <th style={{ padding: "10px 8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "12px 8px" }} className="muted">
                      No rows for this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const overdue = isOverdue(t.dueAt, t.status);
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ fontWeight: 700 }}>{t.order.orderId}</div>
                          <div className="muted small">{t.order.status}</div>
                          <Link className="link" href={`/admin_dashboard/orders/${t.order.orderId}`}>
                            View order
                          </Link>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <div>{t.order.customerName}</div>
                          <div className="muted small">{t.order.customerEmail}</div>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ fontWeight: 700 }}>{t.status}</div>
                          {t.holdReason ? <div className="muted small">Hold: {t.holdReason}</div> : null}
                          {t.filedAt ? <div className="muted small">Filed: {toDateText(t.filedAt)}</div> : null}
                        </td>
                        <td style={{ padding: "10px 8px" }}>{t.assigneeName || "—"}</td>
                        <td style={{ padding: "10px 8px", color: overdue ? "#b91c1c" : undefined }}>
                          {toDateText(t.dueAt)}
                          {overdue ? <div className="small">Overdue</div> : null}
                        </td>
                        <td style={{ padding: "10px 8px" }}>{t.filingReference || "—"}</td>
                        <td style={{ padding: "10px 8px", minWidth: 280 }}>
                          <form action="/api/admin/filing-tasks" method="post" className="form">
                            <input type="hidden" name="orderId" value={t.order.orderId} />
                            <div className="adminActions">
                              <input name="assigneeName" defaultValue={t.assigneeName || ""} placeholder="Assignee" />
                              <button type="submit" className="btn btnSecondary" name="action" value="assign_start">
                                Start
                              </button>
                              <button type="submit" className="btn btnSecondary" name="action" value="mark_ready">
                                Ready
                              </button>
                            </div>
                            <div className="adminActions">
                              <input name="holdReason" defaultValue={t.holdReason || ""} placeholder="Hold reason" />
                              <button type="submit" className="btn btnSecondary" name="action" value="mark_hold">
                                Hold
                              </button>
                            </div>
                            <div className="adminActions">
                              <input name="filingReference" defaultValue={t.filingReference || ""} placeholder="Filing reference" />
                              <input name="filedByName" defaultValue={t.filedByName || ""} placeholder="Filed by" />
                              <button type="submit" className="btn" name="action" value="mark_filed">
                                Mark filed
                              </button>
                              <button type="submit" className="btn btnSecondary" name="action" value="mark_qc_done">
                                QC done
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div className="muted small" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: danger ? "#b91c1c" : "var(--fg)", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className="btn btnSecondary"
      style={{
        borderColor: active ? "#1e40af" : undefined,
        color: active ? "#1e40af" : undefined,
        fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </Link>
  );
}
