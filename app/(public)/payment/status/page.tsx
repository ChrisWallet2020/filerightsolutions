import Link from "next/link";
import { getAuthedUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const orderId = String(searchParams.orderId || "");
  const state = String(searchParams.state || "PENDING");

  let quotePaymentHref: string | null = null;
  if (orderId.trim()) {
    const userId = getAuthedUserId();
    const order = await prisma.order.findUnique({
      where: { orderId: orderId.trim() },
      select: {
        sourcedFromQuote: { select: { token: true, userId: true } },
      },
    });
    if (userId && order?.sourcedFromQuote?.userId === userId) {
      quotePaymentHref = `/account/payment?q=${encodeURIComponent(order.sourcedFromQuote.token)}`;
    }
  }

  return (
    <section className="section">
      <h1>Payment Status</h1>
      <p className="muted">
        Order ID: <strong>{orderId || "—"}</strong>
      </p>
      <div className="notice">
        <p>
          Your payment is currently marked as <strong>{state}</strong>.
          For accuracy, payment confirmation is finalized when our system receives the payment notification from our
          payment gateway.
        </p>
      </div>
      <p className="muted">
        If you have concerns, contact support and include your Order ID.
      </p>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        {quotePaymentHref ? (
          <Link
            href={quotePaymentHref}
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 10,
              background: "#1e40af",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Back to payment details
          </Link>
        ) : null}
        <Link href="/account" style={{ fontWeight: 600, color: "#1d4ed8", fontSize: 15 }}>
          ← Account dashboard
        </Link>
        {!quotePaymentHref && orderId.trim() ? (
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, maxWidth: 520 }}>
            To see this Order ID again later, bookmark this page. If you used a billing link from email, sign in and open
            that same link from <Link href="/account/payment">Payment</Link> — your quote page also shows the Order ID
            while payment is pending.
          </p>
        ) : null}
      </div>
    </section>
  );
}
