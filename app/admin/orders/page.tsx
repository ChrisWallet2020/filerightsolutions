import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusPill } from "@/components/admin/StatusPill";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  let orders: Array<{
    id: string;
    orderId: string;
    status: string;
    customerName: string;
    customerEmail: string;
    pkg: { name: string };
    uploads: Array<{ id: string }>;
    createdAt: Date;
    filingTask?: { status: string } | null;
  }> = [];
  try {
    orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { pkg: true, uploads: true, filingTask: true },
    });
  } catch {
    // Fallback while schema/client is catching up (e.g. dev server still using old Prisma engine).
    const fallback = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { pkg: true, uploads: true },
    });
    orders = fallback.map((o) => ({ ...o, filingTask: null }));
  }

  return (
    <section className="section">
      <h1>Orders</h1>
      <div className="table">
        <div className="tr th" style={{ gridTemplateColumns: "130px 120px 120px 1fr 1fr 80px 110px" }}>
          <div>Order</div><div>Status</div><div>Filing</div><div>Client</div><div>Service</div><div>Uploads</div><div>Created</div>
        </div>
        {orders.map((o) => (
          <div className="tr" key={o.id} style={{ gridTemplateColumns: "130px 120px 120px 1fr 1fr 80px 110px" }}>
            <div><Link className="link" href={`/admin/orders/${o.orderId}`}>{o.orderId}</Link></div>
            <div><StatusPill status={o.status} /></div>
            <div className="muted small">{o.filingTask?.status || "—"}</div>
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