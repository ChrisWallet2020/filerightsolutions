import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { generateUniqueAgentReferralLinkCode } from "@/lib/agentReferralLinkCode";

/** Ensures the agent has `agentReferralLinkCode` and returns the full `/register?agentRef=…` URL (Node-only; same cookie context as RSC). */
export async function ensureAgentReferralSignupUrl(agentUserId: string): Promise<string> {
  try {
    const agentUser = await prisma.user.findUnique({
      where: { id: agentUserId },
      select: { agentReferralLinkCode: true },
    });

    let agentLinkCode = agentUser?.agentReferralLinkCode?.trim() ?? "";
    if (!agentLinkCode) {
      agentLinkCode = await generateUniqueAgentReferralLinkCode();
      await prisma.user.update({
        where: { id: agentUserId },
        data: { agentReferralLinkCode: agentLinkCode },
      });
    }

    const base = String(config.baseUrl).replace(/\/$/, "");
    return `${base}/register?agentRef=${encodeURIComponent(agentLinkCode)}`;
  } catch (e) {
    // Stale Prisma client, missing DB column, or DB unreachable — avoid crashing RSC / route (run `prisma db push` + `prisma generate`).
    console.error("ensureAgentReferralSignupUrl failed:", e);
    return "";
  }
}
