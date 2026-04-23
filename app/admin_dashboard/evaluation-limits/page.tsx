import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalesFeesLimits } from "@/lib/siteSettings";

export default async function AdminEvaluationLimitsPage() {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");

  const limits = await getSalesFeesLimits();

  return (
    <section className="section" style={{ maxWidth: 860 }}>
      <h1>Evaluation Limits</h1>
      <p className="muted adminPageIntro">
        Set optional minimum/maximum values for <b>Sales / Revenues / Receipts / Fees</b>. Leave a box blank to keep
        that side unrestricted.
      </p>

      <section className="adminCard" style={{ marginTop: 16 }}>
        <form
          action="/api/admin/site-settings/evaluation-limits"
          method="post"
          className="form"
          style={{ display: "grid", gap: 12 }}
        >
          <label className="adminLabel">
            Minimum Sales / Revenues / Receipts / Fees
            <input
              name="minSalesFees"
              type="text"
              defaultValue={limits.min ?? ""}
              placeholder="Blank = no minimum"
            />
          </label>

          <label className="adminLabel">
            Maximum Sales / Revenues / Receipts / Fees
            <input
              name="maxSalesFees"
              type="text"
              defaultValue={limits.max ?? ""}
              placeholder="Blank = no maximum"
            />
          </label>

          <div className="adminActions">
            <button type="submit" className="btn">
              Save limits
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
