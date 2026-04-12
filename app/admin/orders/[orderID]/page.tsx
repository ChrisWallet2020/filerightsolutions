import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { config } from "@/lib/config";
import { isAdminAuthed } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { QUOTED_BILLING_CODE } from "@/lib/quotedBillingPackage";
import { redirect } from "next/navigation";

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: { orderID: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) redirect("/admin/login");

  const order = await prisma.order.findUnique({
    where: { orderId: params.orderID },
    include: { pkg: true, uploads: true, payments: true, emailLogs: true }
  });
  if (!order) return <section className="section">Order not found.</section>;

  const uploadLink = `${config.baseUrl}/upload/${order.uploadToken}`;
  const filingParam = typeof searchParams?.filingEmail === "string" ? searchParams.filingEmail : "";

  return (
    <section className="section">
      <h1>{order.orderId}</h1>
      {filingParam === "attempted" ? (
        <p className="notice" style={{ marginTop: 12, maxWidth: 720 }}>
          Filing confirmation send was requested. Check <b>Email Queue</b> below for{" "}
          <code>FILING_COMPLETE_NOTIFY</code> (Sent or Failed). If nothing changed, the order may not be quoted billing
          or the client email may not match a user with a submitted 1701A evaluation.
        </p>
      ) : null}
      {filingParam === "not_paid" ? (
        <p className="notice" style={{ marginTop: 12, maxWidth: 720, borderColor: "#fecaca", background: "#fef2f2" }}>
          Filing confirmation is only sent for orders in <b>PAID</b> status.
        </p>
      ) : null}
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
        {order.pkg.code === QUOTED_BILLING_CODE && order.status === ORDER_STATUS.PAID ? (
          <form
            action="/api/admin/orders/send-filing-confirmation"
            method="post"
            style={{ marginTop: 16, maxWidth: 520 }}
          >
            <input type="hidden" name="orderId" value={order.orderId} />
            <p className="muted small" style={{ margin: "0 0 8px" }}>
              If the client did not receive the filing confirmation, send again (skipped if already sent successfully).
            </p>
            <Button type="submit" variant="secondary">
              Send filing confirmation email
            </Button>
          </form>
        ) : null}
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