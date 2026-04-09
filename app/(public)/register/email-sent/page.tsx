import type { CSSProperties } from "react";
import Link from "next/link";
import { config } from "@/lib/config";

export default function RegisterEmailSentPage({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  const raw = searchParams?.email ? decodeURIComponent(searchParams.email) : "";
  const email = raw.trim();

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0" }}>
      <h1 style={{ marginTop: 0 }}>Check your email</h1>
      <p style={{ color: "#475569", lineHeight: 1.7 }}>
        We&apos;ve sent a message to {email ? <b style={{ color: "#0f172a" }}>{email}</b> : "the address you used"} to
        confirm your registration.
      </p>
      <p style={{ color: "#475569", lineHeight: 1.7 }}>
        Open the email and use the link to go to {config.siteName} and sign in with the password you chose.
      </p>
      <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
        Didn&apos;t receive it? Check spam or promotions, or wait a few minutes. You can still try signing in if you
        already have an account.
      </p>
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link href="/login" style={btnPrimary}>
          Go to sign in
        </Link>
        <Link href="/" style={btnSecondary}>
          Home
        </Link>
      </div>
    </main>
  );
}

const btnPrimary: CSSProperties = {
  display: "inline-block",
  background: "#0f172a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  textDecoration: "none",
};

const btnSecondary: CSSProperties = {
  display: "inline-block",
  background: "white",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "1px solid #e2e8f0",
  textDecoration: "none",
};
