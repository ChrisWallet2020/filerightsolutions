import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { PaymentQuoteClient } from "./PaymentQuoteClient";
import { PaymentSignInGate } from "./PaymentSignInGate";

export const metadata = {
  title: "Payment",
};

export const dynamic = "force-dynamic";

export default async function AccountPaymentPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qRaw = searchParams.q;
  const token = typeof qRaw === "string" ? qRaw.trim() : "";

  const userId = getAuthedUserId();
  const nextPath = token
    ? `/account/payment?q=${encodeURIComponent(token)}`
    : "/account/payment";

  if (!userId) {
    let quoteTeaser:
      | { ok: true; baseAmountPhp: number; expired: boolean; cancelled: boolean }
      | { ok: false } = { ok: false };

    if (token) {
      const q = await prisma.paymentQuote.findUnique({
        where: { token },
        select: { baseAmountPhp: true, status: true, expiresAt: true },
      });
      if (q) {
        const expired = !!(q.expiresAt && q.expiresAt < new Date());
        const cancelled = q.status === "CANCELLED";
        quoteTeaser = {
          ok: true,
          baseAmountPhp: q.baseAmountPhp,
          expired,
          cancelled,
        };
      }
    }

    return <PaymentSignInGate nextPath={nextPath} quoteTeaser={quoteTeaser} />;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    redirect(`/api/auth/prepare-login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!token) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ fontSize: 28, marginTop: 0, color: "#0f172a" }}>Payment</h1>
        <p style={{ lineHeight: 1.7, color: "#475569" }}>
          When your service fee is ready, we email you a <b>personal payment link</b>. Open that link on any device — you
          can sign in on the same page and pay. You can also paste the quote code from your email below (signed in as{" "}
          <b>{user.email}</b>).
        </p>
        <form
          method="get"
          action="/account/payment"
          style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            name="q"
            placeholder="Paste quote code from email"
            required
            style={{
              flex: "1 1 240px",
              minWidth: 200,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Open quote
          </button>
        </form>
        <p style={{ marginTop: 24 }}>
          <Link href="/account" style={{ color: "#1d4ed8", fontWeight: 700 }}>
            ← Back to account
          </Link>
        </p>
      </main>
    );
  }

  const quote = await prisma.paymentQuote.findUnique({
    where: { token },
    include: { resultOrder: true },
  });

  if (!quote || quote.userId !== userId) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ marginTop: 0 }}>Payment link</h1>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          This payment link does not match the account you are signed in with. Sign in with the email we sent the quote
          to, or contact support.
        </p>
        <Link href="/account/payment" style={{ color: "#1d4ed8", fontWeight: 700 }}>
          Try another quote
        </Link>
      </main>
    );
  }

  if (quote.status === "CANCELLED") {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ marginTop: 0 }}>Quote cancelled</h1>
        <p style={{ color: "#475569" }}>This quote is no longer active. Contact us if you still need to pay.</p>
        <Link href="/account">Back to account</Link>
      </main>
    );
  }

  if (quote.expiresAt && quote.expiresAt < new Date()) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ marginTop: 0 }}>Link expired</h1>
        <p style={{ color: "#475569" }}>This payment link has expired. Reply to our email or contact support for a new link.</p>
        <Link href="/account">Back to account</Link>
      </main>
    );
  }

  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: userId, evaluationCompleted: true },
  });

  const totals =
    quote.status === "OPEN"
      ? computeQuotedPaymentTotals(quote.baseAmountPhp, confirmedCredits)
      : {
          baseAmountPhp: quote.baseAmountPhp,
          discountPhp: quote.appliedDiscountPhp ?? 0,
          referralApplied: (quote.appliedDiscountPhp ?? 0) > 0,
          finalAmountPhp: quote.finalChargedPhp ?? quote.baseAmountPhp,
        };

  const order = quote.resultOrder;
  const isPaid = order?.status === ORDER_STATUS.PAID;
  const payDisabled = isPaid;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ fontSize: 28, marginTop: 0, color: "#0f172a" }}>Your bill</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
        Signed in as <b style={{ color: "#0f172a" }}>{user.email}</b>
      </p>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          background: "#f8fafc",
          padding: 18,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "grid", gap: 10, fontSize: 15, color: "#334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>Service Fee</span>
            <b style={{ color: "#0f172a" }}>₱{totals.baseAmountPhp.toLocaleString()}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>Credit Reduction ({config.referralFeeReductionPercent}%)</span>
            <b style={{ color: totals.discountPhp > 0 ? "#15803d" : "#64748b" }}>
              {totals.discountPhp > 0 ? `-₱${totals.discountPhp.toLocaleString()}` : "—"}
            </b>
          </div>
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: 12,
              marginTop: 4,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 800, color: "#0f172a" }}>Total Payment</span>
            <b style={{ fontSize: 18, color: "#0f172a" }}>₱{totals.finalAmountPhp.toLocaleString()}</b>
          </div>
        </div>

        {confirmedCredits < 1 && (
          <p style={{ margin: "14px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            You currently have no confirmed referral credit to apply to this bill.
          </p>
        )}

        {quote.clientNote ? (
          <p style={{ margin: "14px 0 0", fontSize: 14, color: "#334155", lineHeight: 1.7 }}>
            <b>Note:</b> {quote.clientNote}
          </p>
        ) : null}
      </section>

      {isPaid && order ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            marginBottom: 16,
          }}
        >
          Payment received for order <b>{order.orderId}</b>. Thank you.
        </div>
      ) : order && order.status === ORDER_STATUS.PENDING ? (
        <p style={{ color: "#475569", marginBottom: 16 }}>
          A payment is already in progress for order <b>{order.orderId}</b>. You can continue to the payment status
          page or try again below.
        </p>
      ) : null}

      {!isPaid ? (
        <PaymentQuoteClient quoteToken={token} disabled={payDisabled} />
      ) : null}

      <p style={{ marginTop: 16 }}>
        <Link href="/account" style={{ color: "#1d4ed8", fontWeight: 700 }}>
          ← Back to account
        </Link>
      </p>
    </main>
  );
}
