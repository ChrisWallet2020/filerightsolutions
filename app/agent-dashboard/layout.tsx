import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthedAgentUserId } from "@/lib/auth";
import { AgentShell } from "@/components/agent/AgentShell";

export const dynamic = "force-dynamic";

export default async function AgentDashboardLayout({ children }: { children: React.ReactNode }) {
  const id = await getAuthedAgentUserId();
  if (!id) redirect("/agent/login");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { fullName: true, role: true, agentPortalEnabled: true },
  });
  if (!user || (user.role !== "AGENT" && !user.agentPortalEnabled)) redirect("/agent/login");

  return <AgentShell agentName={user.fullName.trim() || "Agent"}>{children}</AgentShell>;
}
