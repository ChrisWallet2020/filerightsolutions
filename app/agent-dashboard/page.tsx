import { redirect } from "next/navigation";
import { AgentDashboardClient } from "@/components/agent/AgentDashboardClient";
import { getAuthedAgentUserId } from "@/lib/auth";
import { ensureAgentReferralSignupUrl } from "@/lib/ensureAgentReferralSignupUrl";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const id = await getAuthedAgentUserId();
  if (!id) redirect("/agent/login");

  const initialReferralLink = await ensureAgentReferralSignupUrl(id);

  return <AgentDashboardClient initialReferralLink={initialReferralLink} />;
}
