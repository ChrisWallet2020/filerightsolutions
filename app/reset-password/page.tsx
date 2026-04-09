"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      setError("Invalid or expired link");
    }
  }

  return (
    <main style={container}>
      <h1>Reset Password</h1>

      {done ? (
        <p>Password updated. You may now sign in.</p>
      ) : (
        <form onSubmit={submit} style={form}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={input}
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button style={btn}>Reset Password</button>
        </form>
      )}
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main style={container}><h1>Reset Password</h1></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

const container = { maxWidth: 500, margin: "0 auto", padding: 40 };
const form = { display: "grid", gap: 12, marginTop: 20 };
const input = { padding: 10, borderRadius: 10, border: "1px solid #ccc" };
const btn = { background: "#1e40af", color: "#fff", padding: 10, borderRadius: 10 };