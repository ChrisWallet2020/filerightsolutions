"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  authButtonFull,
  authCard,
  authFooterLinks,
  authFormGrid,
  authInput,
  authLabel,
  authLead,
  authLink,
  authMain,
  authNoticeErr,
  authNoticeOk,
  authTitle,
} from "@/components/auth/authFlowShared";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again in a moment.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }, [email]);

  const resend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      setError(null);
      setResendPending(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
          setError("Could not resend. Please try again.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setResendPending(false);
      }
    },
    [email]
  );

  return (
    <main style={authMain}>
      <h1 style={authTitle}>Forgot password</h1>
      <p style={authLead}>
        Enter the email you use for your account. We&apos;ll send you a link to choose a new password.
      </p>

      <div style={authCard}>
        {done ? (
          <div style={authFormGrid}>
            <div style={authNoticeOk}>
              If an account exists for <strong style={{ color: "#14532d" }}>{email.trim()}</strong>, we&apos;ve sent a
              reset link. The link expires in about an hour.
            </div>
            <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.65 }}>
              Check your inbox and spam folder. If it still doesn&apos;t arrive, you can resend below.
            </p>
            {error ? <div style={authNoticeErr}>{error}</div> : null}
            <form onSubmit={resend} style={{ display: "grid", gap: 12 }}>
              <SubmitButton
                className="btn btnSecondary"
                style={{ ...authButtonFull, background: "#fff", color: "#0f172a" }}
                pendingExternal={resendPending}
                pendingLabel="Sending…"
                spinnerOnLightBg
              >
                Resend reset link
              </SubmitButton>
            </form>
          </div>
        ) : (
          <form onSubmit={sendReset} style={authFormGrid}>
            {error ? <div style={authNoticeErr}>{error}</div> : null}
            <label style={authLabel}>
              Email
              <input
                className="authFlowField"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={authInput}
              />
            </label>
            <SubmitButton className="btn" style={authButtonFull} pendingExternal={pending} pendingLabel="Sending…">
              Send reset link
            </SubmitButton>
          </form>
        )}
      </div>

      <p style={authFooterLinks}>
        Remember your password?{" "}
        <Link href="/login" style={authLink}>
          Back to sign in
        </Link>
        {" · "}
        <Link href="/" style={authLink}>
          Home
        </Link>
      </p>
    </main>
  );
}
