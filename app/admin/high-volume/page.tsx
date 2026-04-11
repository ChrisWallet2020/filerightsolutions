import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDeadlinePassedEnabled, isHighVolumeEnabled } from "@/lib/siteSettings";

export default async function AdminHighVolumePage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const enabled = await isHighVolumeEnabled();
  const deadlinePassedEnabled = await isDeadlinePassedEnabled();

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ marginTop: 0 }}>Submission Controls</h1>
      <p style={{ color: "#475569", lineHeight: 1.6 }}>
        Manage submission behavior for evaluations, including temporary capacity limits and filing-period controls.
      </p>

      <section style={card}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <b>Current status:</b>{" "}
            <span style={{ color: enabled ? "#b91c1c" : "#166534", fontWeight: 700 }}>
              {enabled ? "High volume mode ON" : "High volume mode OFF"}
            </span>
          </div>

          <form action="/api/admin/site-settings/high-volume" method="post" style={{ display: "flex", gap: 10 }}>
            <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
            <button type="submit" style={btn}>
              {enabled ? "Turn OFF (accept submissions)" : "Turn ON (pause submissions)"}
            </button>
          </form>
        </div>
      </section>

      <section style={card}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <b>Filing deadline notice:</b>{" "}
            <span style={{ color: deadlinePassedEnabled ? "#b91c1c" : "#166534", fontWeight: 700 }}>
              {deadlinePassedEnabled ? "Deadline mode ON" : "Deadline mode OFF"}
            </span>
          </div>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            When turned on, evaluation submit actions are blocked and users are shown the filing deadline notice page.
          </p>

          <form action="/api/admin/site-settings/deadline-passed" method="post" style={{ display: "flex", gap: 10 }}>
            <input type="hidden" name="enabled" value={deadlinePassedEnabled ? "false" : "true"} />
            <button type="submit" style={btn}>
              {deadlinePassedEnabled
                ? "Turn OFF (allow current-cycle submits)"
                : "Turn ON (show deadline-passed notice)"}
            </button>
          </form>
        </div>
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

const btn: React.CSSProperties = {
  background: "#1e40af",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};
