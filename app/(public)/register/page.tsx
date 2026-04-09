import type { CSSProperties } from "react";

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: { error?: string; ref?: string };
}) {
  const error = searchParams?.error;
  const referralFromLink = String(searchParams?.ref || "")
    .trim()
    .toUpperCase();

  const msg =
    error === "invalid"
      ? "Please complete all required fields. Password must be at least 8 characters and both passwords must match."
      : error === "server"
      ? "Something went wrong. Please try again."
      : null;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0" }}>
      <h1>Create Account</h1>
      <p style={{ color: "#475569", lineHeight: 1.7 }}>
        Registration is required to secure your submissions, issue and track referral links, and keep 1701A evaluations properly attributed.
      </p>

      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {msg}
        </div>
      )}

      <form
        method="post"
        action="/api/auth/register"
        style={{ marginTop: 18, display: "grid", gap: 12 }}
      >
        <label>
          Full Name
          <input name="fullName" required style={inputStyle} />
        </label>

        <label>
          Email
          <input name="email" type="email" required style={inputStyle} />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        <label>
          Re-enter Password
          <input
            name="password2"
            type="password"
            required
            minLength={8}
            style={inputStyle}
          />
        </label>

        <label>
          Referral Code (optional)
          <input
            name="ref"
            placeholder="If someone referred you"
            defaultValue={referralFromLink}
            style={inputStyle}
          />
        </label>

        <button style={btnPrimary} type="submit">
          Create Account
        </button>
      </form>

      <p style={{ marginTop: 14, color: "#475569" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 6,
};

const btnPrimary: CSSProperties = {
  background: "#0f172a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};