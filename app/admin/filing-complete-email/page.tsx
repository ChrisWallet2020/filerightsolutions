import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getSubmitted1701aClientOptions } from "@/lib/admin/submittedClientOptions";
import { FilingCompleteEmailForm } from "@/components/admin/FilingCompleteEmailForm";

export const dynamic = "force-dynamic";

export default async function AdminFilingCompleteEmailPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const clients = await getSubmitted1701aClientOptions();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Filing confirmation email</h1>
      <p style={{ color: "#475569", fontSize: 14, marginTop: 8, maxWidth: 720, lineHeight: 1.65 }}>
        Send the standard “filing processed” notice to a client. The address must match a user who has already{" "}
        <b>submitted</b> a 1701A evaluation. Preview the HTML version, then send when ready.
      </p>

      <FilingCompleteEmailForm clients={clients} />
    </main>
  );
}
