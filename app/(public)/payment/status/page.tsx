export default function PaymentStatusPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const orderId = String(searchParams.orderId || "");
  const state = String(searchParams.state || "PENDING");

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
    </section>
  );
}