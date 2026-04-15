import { redirect } from "next/navigation";
import { getAuthedAgentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Alias URL: same portal as `/agent-dashboard` (avoids duplicate client trees / bad local stubs). */
export default async function AgentAccountPage() {
  const id = await getAuthedAgentUserId();
  if (!id) {
    redirect("/agent/login?next=" + encodeURIComponent("/agent/account"));
  }
  redirect("/agent-dashboard");
}
