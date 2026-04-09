"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setDone(true);
  }

  return (
    <main style={container}>
      <h1>Forgot Password</h1>

      {done ? (
        <p style={{ marginTop: 12 }}>
          If an account exists, a reset link has been sent.
        </p>
      ) : (
        <form onSubmit={submit} style={form}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={input}
          />
          <button style={btn}>Send Reset Link</button>
        </form>
      )}
    </main>
  );
}

const container = { maxWidth: 500, margin: "0 auto", padding: 40 };
const form = { display: "grid", gap: 12, marginTop: 20 };
const input = { padding: 10, borderRadius: 10, border: "1px solid #ccc" };
const btn = { background: "#1e40af", color: "#fff", padding: 10, borderRadius: 10 };