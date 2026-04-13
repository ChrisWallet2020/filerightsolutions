import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getAdminClientRecipients } from "@/lib/admin/clientEmailRecipients";
import { ClientEmailerForm } from "@/components/admin/ClientEmailerForm";

export const dynamic = "force-dynamic";

export default async function AdminClientEmailerPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const clients = await getAdminClientRecipients();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Client emailer</h1>
      <p style={{ color: "#475569", fontSize: 14, marginTop: 8, maxWidth: 760, lineHeight: 1.65 }}>
        Send custom client emails wrapped in the same format used by our existing system emails. Preview the final
        HTML before sending.
      </p>

      <ClientEmailerForm clients={clients} />
    </main>
  );
}
