import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminIndexPage() {
  if (!isAdminAuthed()) {
    redirect("/admin_dashboard/login");
  }
  return (
    <section className="section" style={{ maxWidth: 760 }}>
      <h1>Admin Dashboard</h1>
      <p className="muted adminPageIntro">
        Manage operations from the left navigation. For multi-employee processor teams, create individual logins in{" "}
        <code>Processor accounts</code>.
      </p>
      <div className="adminCard" style={{ marginTop: 16 }}>
        <h2>Processor team setup</h2>
        <p className="muted adminBodyText">
          Add separate accounts for each employee so Processor1 and Processor2 income trackers are recorded per person.
        </p>
        <div className="adminActions" style={{ marginTop: 10 }}>
          <Link href="/admin_dashboard/processor-accounts" className="btn">
            Open processor accounts
          </Link>
        </div>
      </div>
    </section>
  );
}
