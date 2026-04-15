"use client";

import { useState } from "react";
import Link from "next/link";

export function AgentRegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await fetch("/api/agent/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          password2,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        linkedExisting?: boolean;
        alreadyEnabled?: boolean;
      };
      if (!res.ok) {
        if (j.error === "email_taken") setErr("That email is already a dedicated agent-only account. Sign in instead.");
        else if (j.error === "wrong_password_existing_account") {
          setErr(
            "That email is already used on FileRight. Enter the exact same password you use on the client sign-in page (/login) to enable agent access."
          );
        } else if (j.error === "password_mismatch") setErr("Passwords do not match.");
        else if (j.error === "invalid" && j.message) setErr(j.message);
        else if (j.error === "server" && j.message) setErr(j.message);
        else setErr(j.message || "Registration failed. Check all fields or try again.");
        return;
      }
      if (j.linkedExisting) {
        window.location.href = j.alreadyEnabled
          ? "/agent/login?linked=1"
          : "/agent/login?registered=1&linked=1";
        return;
      }
      window.location.href = "/agent/login?registered=1";
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="agentCard" style={{ maxWidth: 480, margin: "48px auto" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 500, color: "var(--fg)" }}>Agent registration</h1>
      <p className="muted" style={{ margin: "0 0 18px", lineHeight: 1.6, fontWeight: 400 }}>
        Create an account to submit referred client names. Payouts are tracked in your dashboard after clients pay.
        If you already have a client account with us, you may use the same email and your current password — we enable
        agent access on that account (your client sign-in is unchanged).
      </p>
      <form className="form" onSubmit={(ev) => void onSubmit(ev)}>
        <label>
          Your full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        <label>
          Confirm password
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required minLength={8} />
        </label>
        {err ? (
          <div className="notice" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>{err}</div>
        ) : null}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }} className="muted">
        Already registered? <Link href="/agent/login">Sign in</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: 13 }} className="muted">
        <Link href="/">← Back to site</Link>
      </p>
    </div>
  );
}
