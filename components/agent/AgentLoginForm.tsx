"use client";

import { useState } from "react";
import Link from "next/link";

export function AgentLoginForm({ errorBanner }: { errorBanner?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await fetch("/api/agent/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (j.error === "agent_portal_not_enabled" && j.message) {
          setErr(j.message);
        } else {
          setErr("Invalid email or password. Use the exact email you use to sign in as a client.");
        }
        return;
      }
      window.location.href = "/agent-dashboard";
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="agentCard" style={{ maxWidth: 440, margin: "48px auto" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 500, color: "var(--fg)" }}>Agent sign in</h1>
      <p className="muted" style={{ margin: "0 0 18px", lineHeight: 1.6, fontWeight: 400 }}>
        External agents: sign in to record referred clients and track payouts. If you already have a client account, use
        the same email and password — if agent access is new, complete{" "}
        <Link href="/agent/register">Create agent account</Link> once first (it only enables the agent portal on your
        existing login).
      </p>
      {errorBanner ? (
        <div className="notice" style={{ marginBottom: 14, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" }}>
          {errorBanner}
        </div>
      ) : null}
      <form className="form" onSubmit={(ev) => void onSubmit(ev)}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {err ? (
          <div className="notice" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>{err}</div>
        ) : null}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }} className="muted">
        Need an account? <Link href="/agent/register">Create agent account</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: 13 }} className="muted">
        <Link href="/">← Back to site</Link>
      </p>
    </div>
  );
}
