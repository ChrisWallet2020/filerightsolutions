import type { CSSProperties } from "react";
import Link from "next/link";
import { config } from "@/lib/config";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function RegisterEmailSentPage({
  searchParams,
}: {
  searchParams?: { email?: string; mail?: string };
}) {
  const raw = searchParams?.email ? decodeURIComponent(searchParams.email) : "";
  const email = raw.trim();
  const mailFailed = searchParams?.mail === "failed";

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0" }}>
      <h1 style={{ marginTop: 0 }}>{mailFailed ? "Account created" : "Check your email"}</h1>

      {mailFailed ? (
        <>
          <div
            style={{
              marginBottom: 18,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #fcd34d",
              background: "#fffbeb",
              color: "#92400e",
              lineHeight: 1.65,
            }}
          >
            Your account is ready, but we couldn&apos;t send the welcome email (usually{" "}
            <strong>SMTP is not configured</strong> on the server). Add{" "}
            <code style={{ fontSize: 13 }}>SMTP_HOST</code>, <code style={{ fontSize: 13 }}>SMTP_USER</code>, and{" "}
            <code style={{ fontSize: 13 }}>SMTP_PASS</code> in Vercel → Environment Variables, then redeploy.
          </div>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            You can <strong>sign in now</strong> with{" "}
            {email ? <b style={{ color: "#0f172a" }}>{email}</b> : "your email"} and the password you chose — no link
            from email is required.
          </p>
        </>
      ) : (
        <>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            We&apos;ve sent a welcome message to{" "}
            {email ? <b style={{ color: "#0f172a" }}>{email}</b> : "the address you used"} with a sign-in link.
          </p>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            Open the email and use the link to go to {config.siteName}, or sign in below with your email and password.
          </p>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
            Didn&apos;t receive it? Check spam or promotions, or wait a few minutes. You can still sign in with your
            password — your account is already active.
          </p>
        </>
      )}
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
  background: "#1e40af",
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
