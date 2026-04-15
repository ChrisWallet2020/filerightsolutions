import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getAgentReferralAdminRows } from "@/lib/admin/agentReferralAdminRows";
import { AdminAgentActivityTable } from "@/components/admin/AdminAgentActivityTable";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const rows = await getAgentReferralAdminRows();

  return (
    <section className="section">
      <AdminAgentActivityTable
        title="External agents"
        subtitle="Referral activity, client matching, payment detection, and ledger payout flags. GCash number and account name are entered by agents for manual disbursement by your office — nothing here sends GCash automatically."
        rows={rows}
      />
    </section>
  );
}
