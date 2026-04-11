"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const form = e.target as HTMLFormElement;
      const data = Object.fromEntries(new FormData(form).entries());

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Registration failed");
      }

      router.push("/account");
    } catch (e: any) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border p-6 bg-white">
      <div>
        <div className="text-xs font-medium">Full Name</div>
        <input name="fullName" className="w-full rounded-lg border px-3 py-2" required />
      </div>

      <div>
        <div className="text-xs font-medium">Email</div>
        <input name="email" type="email" className="w-full rounded-lg border px-3 py-2" required />
      </div>

      <div>
        <div className="text-xs font-medium">Password</div>
        <input name="password" type="password" className="w-full rounded-lg border px-3 py-2" required />
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{err}</div> : null}

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-xl bg-[#1e40af] px-4 py-2 text-white font-semibold disabled:opacity-60${loading ? " btnIsPending" : ""}`}
      >
        {loading ? (
          <span className="btnWithSpinner">
            <span className="btnSpinner" aria-hidden />
            Creating account…
          </span>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}