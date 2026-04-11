"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  authButtonFull,
  authCard,
  authFieldHint,
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

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!token) {
        setError("This link is missing a token. Open the link from your email again.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }

      setPending(true);
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        if (res.ok) {
          setDone(true);
          return;
        }

        const j = await res.json().catch(() => ({}));
        if (j?.error === "weak_password") {
          setError("Password must be at least 8 characters.");
        } else {
          setError("This link is invalid or has expired. Request a new reset from the sign-in page.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setPending(false);
      }
    },
    [token, password, confirm]
  );

  if (!token && !done) {
    return (
      <main style={authMain}>
        <h1 style={authTitle}>Reset password</h1>
        <p style={authLead}>This page needs a valid link from your reset email.</p>
        <div style={authCard}>
          <div style={authNoticeErr}>
            No reset token was found. Use the button in the email we sent, or request a new reset link.
          </div>
        </div>
        <p style={authFooterLinks}>
          <Link href="/forgot-password" style={authLink}>
            Forgot password
          </Link>
          {" · "}
          <Link href="/login" style={authLink}>
            Sign in
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main style={authMain}>
      <h1 style={authTitle}>Reset password</h1>
      <p style={authLead}>Choose a strong password you haven&apos;t used elsewhere.</p>

      <div style={authCard}>
        {done ? (
          <div style={authNoticeOk}>
            Your password has been updated. You can sign in with your new password now.
          </div>
        ) : (
          <form onSubmit={submit} style={authFormGrid}>
            {error ? <div style={authNoticeErr}>{error}</div> : null}
            <div>
              <label htmlFor="reset-password-new" style={authLabel}>
                New password
              </label>
              <p id="reset-password-new-hint" style={authFieldHint}>
                Use at least 8 characters. Avoid passwords you use on other sites.
              </p>
              <input
                id="reset-password-new"
                className="authFlowField"
                type="password"
                autoComplete="new-password"
                aria-describedby="reset-password-new-hint"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={authInput}
              />
            </div>
            <div>
              <label htmlFor="reset-password-confirm" style={authLabel}>
                Confirm new password
              </label>
              <p id="reset-password-confirm-hint" style={authFieldHint}>
                Re-enter the same password to confirm.
              </p>
              <input
                id="reset-password-confirm"
                className="authFlowField"
                type="password"
                autoComplete="new-password"
                aria-describedby="reset-password-confirm-hint"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                style={authInput}
              />
            </div>
            <SubmitButton className="btn" style={authButtonFull} pendingExternal={pending} pendingLabel="Updating…">
              Reset password
            </SubmitButton>
          </form>
        )}
      </div>

      <p style={authFooterLinks}>
        {done ? (
          <Link href="/login" style={authLink}>
            Go to sign in
          </Link>
        ) : (
          <>
            <Link href="/login" style={authLink}>
              Cancel and sign in
            </Link>
            {" · "}
            <Link href="/forgot-password" style={authLink}>
              Request a new link
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
