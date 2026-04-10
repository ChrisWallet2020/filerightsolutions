import Link from "next/link";
import { LoginPostForm } from "@/components/auth/LoginPostForm";

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

      <LoginPostForm
        nextPath={nextPath}
        variant="dark"
        formStyle={{ marginTop: 22, display: "grid", gap: 12 }}
        submitLabel="Sign in to continue"
        pendingLabel="Signing in…"
      />

      <p style={{ marginTop: 16, color: "#475569", fontSize: 14 }}>
        No account? <Link href="/register">Create one</Link>
        {" · "}
        <Link href="/login">Sign in on the main page</Link>
      </p>
    </main>
  );
}
