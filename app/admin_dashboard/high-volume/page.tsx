import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDeadlinePassedEnabled, isHighVolumeEnabled } from "@/lib/siteSettings";

export default async function AdminHighVolumePage() {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");

  const enabled = await isHighVolumeEnabled();
  const deadlinePassedEnabled = await isDeadlinePassedEnabled();

  return (
    <section className="section" style={{ maxWidth: 860 }}>
      <h1>Submission Controls</h1>
      <p className="muted adminPageIntro">
        Manage submission behavior for evaluations, including temporary capacity limits and filing-period controls.
      </p>

      <section className="adminCard" style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <b>Current status:</b>{" "}
            <span style={{ color: enabled ? "#b91c1c" : "#166534", fontWeight: 700 }}>
              {enabled ? "High volume mode ON" : "High volume mode OFF"}
            </span>
          </div>

          <form action="/api/admin/site-settings/high-volume" method="post" className="adminActions">
            <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
            <button type="submit" className="btn">
              {enabled ? "Turn OFF (accept submissions)" : "Turn ON (pause submissions)"}
            </button>
          </form>
        </div>
      </section>

      <section className="adminCard" style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <b>Filing deadline notice:</b>{" "}
            <span style={{ color: deadlinePassedEnabled ? "#b91c1c" : "#166534", fontWeight: 700 }}>
              {deadlinePassedEnabled ? "Deadline mode ON" : "Deadline mode OFF"}
            </span>
          </div>
          <p className="muted adminBodyText">
            When turned on, evaluation submit actions are blocked and users are shown the filing deadline notice page.
          </p>

          <form action="/api/admin/site-settings/deadline-passed" method="post" className="adminActions">
            <input type="hidden" name="enabled" value={deadlinePassedEnabled ? "false" : "true"} />
            <button type="submit" className="btn">
              {deadlinePassedEnabled
                ? "Turn OFF (allow current-cycle submits)"
                : "Turn ON (show deadline-passed notice)"}
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}
