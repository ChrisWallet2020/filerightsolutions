"use client";

export default function AccountClient({
  user,
  referralLink,
  credited,
}: {
  user: { fullName: string; email: string };
  referralLink: string;
  credited: number;
}) {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 0" }}>
      <h1 style={{ marginBottom: 6 }}>Account</h1>
      <p style={{ color: "#475569", marginTop: 0 }}>
        Signed in as <b>{user.fullName}</b> ({user.email})
      </p>

      <section style={card}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Your Referral Link</h2>
        <p style={{ color: "#475569", lineHeight: 1.7, marginTop: 8 }}>
          Share this link with another JO/COS professional for a complimentary 1701A evaluation.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input readOnly value={referralLink} style={inputStyle} />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(referralLink)}
            style={btnSecondary}
          >
            Copy Link
          </button>
        </div>

        <p style={{ color: "#475569", marginTop: 10 }}>
          Referral credits confirmed from completed evaluations: <b>{credited}</b>
        </p>

        <p style={{ color: "#475569", marginTop: 10 }}>
          The referral adjustment applies once the referred client completes the 1701A evaluation.
          The referred client is not required to proceed with amendment assistance.
        </p>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Free 1701A Evaluation</h2>
        <p style={{ color: "#475569", lineHeight: 1.7, marginTop: 8 }}>
          Submit a request to begin your complimentary 1701A review. This creates an evaluation record in your account.
        </p>

        <form method="post" action="/api/evaluations/submit" style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label>
            Tax Year (optional)
            <input name="taxYear" placeholder="e.g., 2025" style={inputStyle} />
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" placeholder="Any context you want to include" style={{ ...inputStyle, height: 90 }} />
          </label>
          <button style={btnPrimary} type="submit">
            Start Free Evaluation
          </button>
        </form>
      </section>

      <form method="post" action="/api/auth/logout" style={{ marginTop: 16 }}>
        <button style={btnDanger} type="submit">Sign Out</button>
      </form>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  background: "white",
};

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

const btnSecondary: React.CSSProperties = {
  background: "white",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: "white",
  color: "#b91c1c",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "1px solid #fecaca",
  cursor: "pointer",
};