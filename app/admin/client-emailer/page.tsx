import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { ClientEmailerForm } from "@/components/admin/ClientEmailerForm";

export const dynamic = "force-dynamic";

export default async function AdminClientEmailerPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Client emailer</h1>
      <p style={{ color: "#475569", fontSize: 14, marginTop: 8, maxWidth: 760, lineHeight: 1.65 }}>
        Send custom client emails wrapped in the same format used by our existing system emails. Enter any recipient
        email address, then preview the final HTML before sending.
      </p>

      <ClientEmailerForm />
    </main>
  );
}
