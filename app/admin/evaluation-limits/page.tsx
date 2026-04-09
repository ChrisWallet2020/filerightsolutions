import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalesFeesLimits } from "@/lib/siteSettings";

export default async function AdminEvaluationLimitsPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const limits = await getSalesFeesLimits();

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ marginTop: 0 }}>Evaluation Limits</h1>
      <p style={{ color: "#475569", lineHeight: 1.6 }}>
        Set optional minimum/maximum values for <b>Sales / Revenues / Receipts / Fees</b>. Leave a box blank to keep
        that side unrestricted.
      </p>

      <section style={card}>
        <form action="/api/admin/site-settings/evaluation-limits" method="post" style={{ display: "grid", gap: 12 }}>
          <label style={label}>
            Minimum Sales / Revenues / Receipts / Fees
            <input
              name="minSalesFees"
              type="text"
              defaultValue={limits.min ?? ""}
              placeholder="Blank = no minimum"
              style={inputStyle}
            />
          </label>

          <label style={label}>
            Maximum Sales / Revenues / Receipts / Fees
            <input
              name="maxSalesFees"
              type="text"
              defaultValue={limits.max ?? ""}
              placeholder="Blank = no maximum"
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" style={btn}>
              Save limits
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  background: "white",
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 500,
  color: "#0f172a",
};

const btn: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};
