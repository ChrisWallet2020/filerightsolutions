import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { clientPaymentNoticePath, paymentAcknowledged } from "@/lib/clientPaymentFlow";
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
  const nextPath = token ? clientPaymentNoticePath(token) : "/account/payment";

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

  if (token && !paymentAcknowledged(searchParams)) {
    redirect(clientPaymentNoticePath(token));
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
              background: "#1e40af",
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
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 56px" }}>
      <header style={{ marginBottom: 28 }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Secure checkout
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: 1.2,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          Payment summary
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.5, color: "#64748b" }}>
          Signed in as{" "}
          <span style={{ color: "#334155", fontWeight: 600 }}>{user.email}</span>
        </p>
      </header>

      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.07)",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            background: "#fafbfc",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Charges
          </h2>
        </div>

        <div style={{ padding: "20px 20px 4px", display: "grid", gap: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 15,
              color: "#334155",
            }}
          >
            <span>Service fee</span>
            <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
              ₱{totals.baseAmountPhp.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 15,
              color: "#334155",
            }}
          >
            <span>Referral credit ({config.referralFeeReductionPercent}%)</span>
            <span
              style={{
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: totals.discountPhp > 0 ? "#15803d" : "#94a3b8",
              }}
            >
              {totals.discountPhp > 0 ? `−₱${totals.discountPhp.toLocaleString()}` : "—"}
            </span>
          </div>
        </div>

        <div
          style={{
            margin: "12px 20px 0",
            padding: "16px 0 20px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Total payment</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#0f172a",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ₱{totals.finalAmountPhp.toLocaleString()}
          </span>
        </div>

        {confirmedCredits < 1 ? (
          <p
            style={{
              margin: 0,
              padding: "14px 20px 18px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#64748b",
              borderTop: "1px solid var(--line)",
              background: "#fafbfc",
            }}
          >
            No confirmed referral credits apply to this payment yet. Credits appear after referred clients complete their
            evaluation.
          </p>
        ) : null}

        {quote.clientNote ? (
          <div
            style={{
              padding: "16px 20px 20px",
              borderTop: "1px solid var(--line)",
              background: "#fff",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
              Note from your preparer
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#334155" }}>{quote.clientNote}</p>
          </div>
        ) : null}
      </section>

      {isPaid && order ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Payment received for order <b>{order.orderId}</b>. Thank you.
        </div>
      ) : order && order.status === ORDER_STATUS.PENDING ? (
        <p style={{ color: "#475569", marginBottom: 20, fontSize: 14, lineHeight: 1.65 }}>
          A payment is already in progress for order <b>{order.orderId}</b>. You can open the{" "}
          <Link
            href={`/payment/status?orderId=${encodeURIComponent(order.orderId)}&state=PENDING`}
            style={{ color: "#1d4ed8", fontWeight: 700 }}
          >
            payment status page
          </Link>{" "}
          to copy your Order ID, or try again below.
        </p>
      ) : null}

      {!isPaid ? (
        <PaymentQuoteClient quoteToken={token} disabled={payDisabled} />
      ) : null}

      <p style={{ marginTop: 22 }}>
        <Link
          href="/account"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#475569",
          }}
        >
          ← Back to account
        </Link>
      </p>
    </main>
  );
}
