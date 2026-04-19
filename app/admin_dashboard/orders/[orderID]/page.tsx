import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { config } from "@/lib/config";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ensureFilingTaskForPaidOrder } from "@/lib/filingTasks";
import { ORDER_STATUS } from "@/lib/constants";

type OrderDetailRow = Prisma.OrderGetPayload<{
  include: { pkg: true; uploads: true; payments: true; emailLogs: true; filingTask: true };
}>;

export default async function OrderDetail({ params }: { params: { orderID: string } }) {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");

  let order: OrderDetailRow | null = null;
  try {
    order = await prisma.order.findUnique({
      where: { orderId: params.orderID },
      include: { pkg: true, uploads: true, payments: true, emailLogs: true, filingTask: true },
    });
  } catch {
    const fallback = await prisma.order.findUnique({
      where: { orderId: params.orderID },
      include: { pkg: true, uploads: true, payments: true, emailLogs: true },
    });
    order = fallback ? ({ ...fallback, filingTask: null } as OrderDetailRow) : null;
  }
  if (!order) return <section className="section">Order not found.</section>;

  if (order.status === ORDER_STATUS.PAID && !order.filingTask) {
    await ensureFilingTaskForPaidOrder({ id: order.id, paidAt: order.paidAt });
  }

  const uploadLink = `${config.baseUrl}/upload/${order.uploadToken}`;

  return (
    <section className="section">
      <h1>{order.orderId}</h1>
      <div className="muted">Upload link: <a className="link" href={uploadLink}>{uploadLink}</a></div>

      <div className="grid2">
        <div className="box">
          <div className="boxTitle">Client</div>
          <div>{order.customerName}</div>
          <div className="muted">{order.customerEmail}</div>
          {order.customerPhone && <div className="muted">{order.customerPhone}</div>}
        </div>

        <div className="box">
          <div className="boxTitle">Service</div>
          <div>{order.pkg.name}</div>
          <div className="muted">Fee: ₱{(order.amountPhp / 100).toLocaleString()}</div>
          <div className="muted">Status: {order.status}</div>
        </div>
      </div>

      <div className="section">
        <h2>Filing Workflow</h2>
        <div className="box" style={{ maxWidth: 720 }}>
          <div className="boxTitle">Task status</div>
          <div className="muted">
            {order.filingTask?.status || (order.status === ORDER_STATUS.PAID ? "READY_TO_FILE (auto)" : "Not created")}
          </div>
          {order.filingTask?.dueAt ? <div className="muted">Due: {order.filingTask.dueAt.toLocaleString()}</div> : null}
          {order.filingTask?.filingReference ? (
            <div className="muted">Filing reference: {order.filingTask.filingReference}</div>
          ) : null}
          <div style={{ marginTop: 10 }}>
            <a className="link" href="/admin_dashboard/filing-queue">
              Open filing queue
            </a>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Update Status</h2>
        <form action="/api/admin/orders" method="post" className="form" style={{ maxWidth: 520 }}>
          <input type="hidden" name="orderId" value={order.orderId} />
          <label>
            New status
            <select name="status" defaultValue={order.status}>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </label>
          <Button type="submit">Save</Button>
        </form>
      </div>

      <div className="section">
        <h2>Uploads ({order.uploads.length})</h2>
        <ul className="muted">
          {order.uploads.map((u) => (
            <li key={u.id}>{u.filename} — {Math.round(u.sizeBytes / 1024)} KB</li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Email Queue</h2>
        <ul className="muted">
          {order.emailLogs.map((e) => (
            <li key={e.id}>
              {e.type} — {e.sentAt ? `Sent ${e.sentAt.toISOString()}` : e.failedAt ? `Failed: ${e.failReason}` : "Pending"}
            </li>
          ))}
        </ul>
        <div className="muted small">
          Run dispatcher: POST /api/cron/email-dispatch
        </div>
      </div>
    </section>
  );
}