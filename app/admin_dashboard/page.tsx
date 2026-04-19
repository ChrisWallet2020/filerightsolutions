import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProcessor1Credentials, getProcessor2Credentials } from "@/lib/siteSettings";

export default async function AdminIndexPage() {
  if (!isAdminAuthed()) {
    redirect("/admin_dashboard/login");
  }
  const processor1 = await getProcessor1Credentials();
  const processor2 = await getProcessor2Credentials();

  return (
    <section className="section" style={{ maxWidth: 760 }}>
      <h1>Admin Dashboard</h1>
      <p className="muted adminPageIntro">
        Configure Processor1 and Processor2 dashboard logins. Credentials are visible here and used by{" "}
        <code>/processor1_dashboard/login</code> and <code>/processor2_dashboard/login</code>.
      </p>

      <form action="/api/admin/processor1-credentials" method="post" className="form" style={{ marginTop: 14 }}>
        <label className="adminLabel">
          <strong>Processor1 username</strong>
          <input name="username" defaultValue={processor1.username} required />
        </label>
        <label className="adminLabel">
          <strong>Processor1 password</strong>
          <input name="password" defaultValue={processor1.password} required />
        </label>
        <button type="submit" className="btn" style={{ width: "fit-content" }}>
          Save Processor1 credentials
        </button>
      </form>

      <form action="/api/admin/processor2-credentials" method="post" className="form" style={{ marginTop: 22 }}>
        <label className="adminLabel">
          <strong>Processor2 username</strong>
          <input name="username" defaultValue={processor2.username} required />
        </label>
        <label className="adminLabel">
          <strong>Processor2 password</strong>
          <input name="password" defaultValue={processor2.password} required />
        </label>
        <button type="submit" className="btn" style={{ width: "fit-content" }}>
          Save Processor2 credentials
        </button>
      </form>
    </section>
  );
}
