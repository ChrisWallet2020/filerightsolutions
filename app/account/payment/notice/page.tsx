import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";
import { clientPaymentCheckoutPath } from "@/lib/clientPaymentFlow";
import { PaymentSignInGate } from "../PaymentSignInGate";

export const metadata = {
  title: "Tax filing responsibility",
};

export const dynamic = "force-dynamic";

export default async function TaxFilingResponsibilityNoticePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qRaw = searchParams.q;
  const token = typeof qRaw === "string" ? qRaw.trim() : "";

  if (!token) {
    redirect("/account/payment");
  }

  const userId = getAuthedUserId();
  const nextPath = `/account/payment/notice?q=${encodeURIComponent(token)}`;

  if (!userId) {
    let quoteTeaser:
      | { ok: true; baseAmountPhp: number; expired: boolean; cancelled: boolean }
      | { ok: false } = { ok: false };

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

    return (
      <PaymentSignInGate
        nextPath={nextPath}
        quoteTeaser={quoteTeaser}
        introLead="Sign in with the email address we sent this quote to. After sign-in, you will see a short tax filing responsibility notice, then your payment summary."
      />
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    redirect(`/api/auth/prepare-login?next=${encodeURIComponent(nextPath)}`);
  }

  const quote = await prisma.paymentQuote.findUnique({
    where: { token },
    select: { userId: true, status: true, expiresAt: true },
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
        <p style={{ color: "#475569" }}>
          This payment link has expired. Reply to our email or contact support for a new link.
        </p>
        <Link href="/account">Back to account</Link>
      </main>
    );
  }

  const checkoutHref = clientPaymentCheckoutPath(token);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 56px" }}>
      <header style={{ marginBottom: 24 }}>
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
            fontSize: 26,
            lineHeight: 1.25,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          <span aria-hidden style={{ marginRight: 8 }}>
            ⚠️
          </span>
          Tax Filing Responsibility Notice
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55, color: "#64748b" }}>
          Signed in as <span style={{ color: "#334155", fontWeight: 600 }}>{user.email}</span>
        </p>
      </header>

      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.07)",
          padding: "22px 22px 24px",
          marginBottom: 24,
        }}
      >
        <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.65, color: "#334155" }}>
          Under the National Internal Revenue Code (NIRC) of 1997, Section 56A, which governs tax compliance in the
          Philippines:
        </p>
        <blockquote
          style={{
            margin: "0 0 18px",
            padding: "14px 16px",
            borderLeft: "4px solid #1e40af",
            background: "#f8fafc",
            fontSize: 15,
            lineHeight: 1.65,
            color: "#1e293b",
            fontStyle: "italic",
          }}
        >
          &ldquo;Every taxpayer shall pay his taxes as computed in the return required to be filed by him.&rdquo;
        </blockquote>
        <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.65, color: "#334155" }}>
          We act solely as a third-party service provider facilitating the preparation and optimization of your tax
          filing.
        </p>
        <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.65, color: "#334155" }}>
          You have full discretion to choose whether to proceed with:
        </p>
        <ul style={{ margin: "0 0 16px", paddingLeft: 22, color: "#334155", lineHeight: 1.65, fontSize: 15 }}>
          <li>your previously filed return, or</li>
          <li>the amended (optimized) return prepared through our service.</li>
        </ul>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#334155" }}>
          The decision to file any return, and to designate any representative to act on your behalf, is exclusively your
          own and is not controlled or determined by any office, agency, or third party.
        </p>
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Link
          href={checkoutHref}
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 160,
            padding: "12px 22px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Proceed
        </Link>
        <Link
          href="/account"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 120,
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#475569",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Cancel
        </Link>
      </div>

      <p style={{ marginTop: 28, fontSize: 13, lineHeight: 1.6, color: "#94a3b8" }}>
        {config.siteName} — payment is processed by our payment partner after you continue.
      </p>
    </main>
  );
}
