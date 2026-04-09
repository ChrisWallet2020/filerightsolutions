import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusPill } from "@/components/admin/StatusPill";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { pkg: true, uploads: true }
  });

  return (
    <section className="section">
      <h1>Orders</h1>
      <div className="table">
        <div className="tr th">
          <div>Order</div><div>Status</div><div>Client</div><div>Service</div><div>Uploads</div><div>Created</div>
        </div>
        {orders.map((o) => (
          <div className="tr" key={o.id}>
            <div><Link className="link" href={`/admin/orders/${o.orderId}`}>{o.orderId}</Link></div>
            <div><StatusPill status={o.status} /></div>
            <div>{o.customerName}<div className="muted small">{o.customerEmail}</div></div>
            <div className="muted">{o.pkg.name}</div>
            <div>{o.uploads.length}</div>
            <div className="muted small">{o.createdAt.toISOString().slice(0, 10)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}