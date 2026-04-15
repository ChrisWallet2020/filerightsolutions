import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getAgentReferralAdminRows } from "@/lib/admin/agentReferralAdminRows";
import { AdminAgentActivityTable } from "@/components/admin/AdminAgentActivityTable";

export const dynamic = "force-dynamic";

/** Admin “Chris” view — same agent program data as /admin/agents, including GCash payout details. */
export default async function AdminChrisAgentPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const rows = await getAgentReferralAdminRows();

  return (
    <section className="section">
      <AdminAgentActivityTable
        title="Chris — agent program"
        subtitle="Same referral ledger as External agents: each row shows the agent, their GCash payout details (for manual GCash sends), referred name, matched client, paid time, payout completion, and amount."
        rows={rows}
      />
    </section>
  );
}
