import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getFilingCompleteNotifyClientRows } from "@/lib/admin/filingCompleteNotifyClients";
import { FilingCompleteEmailForm } from "@/components/admin/FilingCompleteEmailForm";

export const dynamic = "force-dynamic";

export default async function AdminFilingCompleteEmailPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const clients = await getFilingCompleteNotifyClientRows();

  return (
    <section className="section">
      <h1>Filing confirmation email</h1>
      <p className="muted" style={{ marginTop: 8, maxWidth: 760, lineHeight: 1.65 }}>
        Send the standard “filing processed” notice to a client who has <b>paid</b> and <b>submitted</b> a 1701A
        evaluation. Preview the HTML version, then send when ready (sign-in email is used for delivery).
      </p>

      <FilingCompleteEmailForm clients={clients} />
    </section>
  );
}
