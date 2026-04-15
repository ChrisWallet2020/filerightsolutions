import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { ClientEmailerForm } from "@/components/admin/ClientEmailerForm";

export const dynamic = "force-dynamic";

export default async function AdminClientEmailerPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  return (
    <section className="section">
      <h1>Client emailer</h1>
      <p className="muted adminPageIntro">
        Send custom client emails using the same layout and footer as billing emails. Enter any recipient email
        address, preview the HTML, then send.
      </p>

      <ClientEmailerForm />
    </section>
  );
}
