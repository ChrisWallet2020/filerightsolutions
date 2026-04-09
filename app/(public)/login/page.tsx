export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const error = searchParams?.error;

  const msg =
    error === "invalid"
      ? "Incorrect email or password."
      : error === "exists"
      ? "That email is already registered. Please sign in."
      : error === "server"
      ? "Something went wrong. Please try again."
      : null;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0" }}>
      <h1>Sign In</h1>

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

      <form method="post" action="/api/auth/login" style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <label>
          Email
          <input name="email" type="email" required style={inputStyle} />
        </label>

        <label>
          Password
          <input name="password" type="password" required style={inputStyle} />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
          <a href="/forgot-password" style={linkStyle}>
            Forgot password?
          </a>
        </div>

        <button style={btnPrimary} type="submit">
          Sign In
        </button>
      </form>

      <p style={{ marginTop: 14, color: "#475569" }}>
        No account yet? <a href="/register">Create one</a>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 6,
};

const btnPrimary: React.CSSProperties = {
  background: "#1e40af",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  color: "#1e40af",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};