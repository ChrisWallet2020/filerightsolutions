import type { CSSProperties } from "react";
import Link from "next/link";

type Teaser =
  | { ok: true; baseAmountPhp: number; expired: boolean; cancelled: boolean }
  | { ok: false };

export function PaymentSignInGate({ nextPath, quoteTeaser }: { nextPath: string; quoteTeaser: Teaser }) {
  const msg =
    quoteTeaser.ok && quoteTeaser.cancelled
      ? "This quote is no longer active. Sign in only if you need to view your account."
      : quoteTeaser.ok && quoteTeaser.expired
      ? "This payment link has expired. You can still sign in to your account."
      : quoteTeaser.ok
      ? "Sign in with the email we sent this quote to, then you can pay."
      : "Sign in to open a payment link or paste a quote code from your email.";

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ fontSize: 28, marginTop: 0, color: "#0f172a" }}>Payment</h1>
      <p style={{ lineHeight: 1.7, color: "#475569" }}>{msg}</p>

      {quoteTeaser.ok && !quoteTeaser.cancelled && !quoteTeaser.expired ? (
        <section
          style={{
            marginTop: 18,
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            background: "#f8fafc",
            padding: 16,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 15 }}>
            <span style={{ color: "#334155" }}>Amount due</span>
            <b style={{ color: "#0f172a" }}>₱{quoteTeaser.baseAmountPhp.toLocaleString()}</b>
          </div>
        </section>
      ) : null}

      <form method="post" action="/api/auth/login" style={{ marginTop: 22, display: "grid", gap: 12 }}>
        <input type="hidden" name="next" value={nextPath} />
        <label style={{ fontSize: 14, color: "#334155" }}>
          Email
          <input name="email" type="email" required style={inputStyle} autoComplete="email" />
        </label>
        <label style={{ fontSize: 14, color: "#334155" }}>
          Password
          <input name="password" type="password" required style={inputStyle} autoComplete="current-password" />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
          <Link href="/forgot-password" style={linkStyle}>
            Forgot password?
          </Link>
        </div>
        <button type="submit" style={btnPrimary}>
          Sign in to continue
        </button>
      </form>

      <p style={{ marginTop: 16, color: "#475569", fontSize: 14 }}>
        No account? <Link href="/register">Create one</Link>
        {" · "}
        <Link href="/login">Sign in on the main page</Link>
      </p>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 6,
  boxSizing: "border-box",
};

const btnPrimary: CSSProperties = {
  background: "#0f172a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const linkStyle: CSSProperties = {
  color: "#1d4ed8",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};
