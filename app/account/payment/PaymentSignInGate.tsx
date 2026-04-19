import type { CSSProperties } from "react";
import Link from "next/link";
import { LoginPostForm } from "@/components/auth/LoginPostForm";
import { config } from "@/lib/config";

type Teaser =
  | { ok: true; baseAmountPhp: number; expired: boolean; cancelled: boolean }
  | { ok: false };

const main: CSSProperties = {
  maxWidth: 520,
  margin: "0 auto",
  padding: "40px 20px 56px",
};

const kicker: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.2,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const lead: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 15,
  lineHeight: 1.65,
  color: "#475569",
};

const card: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.07)",
  overflow: "hidden",
  marginBottom: 24,
};

const cardHead: CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid var(--line)",
  background: "#fafbfc",
};

const cardHeadTitle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
};

const notice: CSSProperties = {
  margin: 0,
  padding: "16px 20px",
  fontSize: 14,
  lineHeight: 1.65,
  color: "#334155",
};

const signInSection: CSSProperties = {
  padding: "20px 20px 22px",
  borderTop: "1px solid var(--line)",
  background: "#fafbfc",
};

const signInLabel: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
};

const footer: CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 1.65,
  color: "#475569",
};

const footerLink: CSSProperties = {
  color: "#1e40af",
  fontWeight: 700,
  textDecoration: "none",
};

export function PaymentSignInGate({
  nextPath,
  quoteTeaser,
  introLead,
}: {
  nextPath: string;
  quoteTeaser: Teaser;
  /** When set, replaces the default sign-in explanation (e.g. notice step before payment). */
  introLead?: string;
}) {
  const leadText =
    quoteTeaser.ok && quoteTeaser.cancelled
      ? "This quote is no longer active. You can still sign in to manage your account."
      : quoteTeaser.ok && quoteTeaser.expired
      ? "This payment link has expired. Sign in to use your account, or contact us for a new link."
      : introLead?.trim() ||
        (quoteTeaser.ok
          ? "Sign in with the email address we sent this quote to. After sign-in, you’ll see your full payment summary and can pay securely."
          : "Sign in with the account that received the quote. If you opened this link by mistake, you can sign in and paste your quote code on the payment page.");

  const showAmountPreview = quoteTeaser.ok && !quoteTeaser.cancelled && !quoteTeaser.expired;

  return (
    <main style={main}>
      <header style={{ marginBottom: 28 }}>
        <p style={kicker}>Secure checkout</p>
        <h1 style={title}>Complete your payment</h1>
        <p style={lead}>{leadText}</p>
      </header>

      <section style={card}>
        <div style={cardHead}>
          <h2 style={cardHeadTitle}>Charges</h2>
        </div>

        {showAmountPreview ? (
          <>
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
                <span>Service fee (quoted)</span>
                <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                  ₱{quoteTeaser.baseAmountPhp.toLocaleString()}
                </span>
              </div>
            </div>
            <p
              style={{
                margin: 0,
                padding: "12px 20px 18px",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#64748b",
                borderTop: "1px solid var(--line)",
                background: "#fafbfc",
              }}
            >
              Your final total may be lower if you have eligible referral credits ({config.referralFeeReductionPercent}%
              off the service fee per credit). That is calculated automatically after you sign in.
            </p>
          </>
        ) : quoteTeaser.ok && quoteTeaser.cancelled ? (
          <p style={{ ...notice, background: "#fff7ed", color: "#9a3412", borderBottom: "1px solid #fed7aa" }}>
            This quote is no longer active. If you still need to pay, reply to our email or contact support.
          </p>
        ) : quoteTeaser.ok && quoteTeaser.expired ? (
          <p style={{ ...notice, background: "#fefce8", color: "#854d0e", borderBottom: "1px solid #fef08a" }}>
            This payment link has expired. Request a new link from support, or sign in below to open your account.
          </p>
        ) : (
          <p style={notice}>
            We couldn&apos;t load quote details from this link. Sign in below — if you have a quote code from email, you
            can use it after sign-in.
          </p>
        )}

        <div style={signInSection}>
          <p style={signInLabel}>Sign in to continue</p>
          <LoginPostForm
            nextPath={nextPath}
            variant="blue"
            formStyle={{ marginTop: 14, display: "grid", gap: 12 }}
            submitLabel="Sign in"
            pendingLabel="Signing in…"
          />
        </div>
      </section>

      <p style={footer}>
        No account yet?{" "}
        <Link href="/register" style={footerLink}>
          Create one
        </Link>
        {" · "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} style={footerLink}>
          Open sign-in on the main page
        </Link>
        {" · "}
        <Link href="/" style={{ ...footerLink, fontWeight: 600 }}>
          Home
        </Link>
      </p>
    </main>
  );
}
