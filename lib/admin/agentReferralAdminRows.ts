import { prisma } from "@/lib/db";

export type AgentReferralAdminRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  agentId: string;
  nameEntered: string;
  matchedUserId: string | null;
  paidDetectedAt: Date | null;
  payoutCompletedAt: Date | null;
  amountPhp: number;
  payoutBlockedReason: string | null;
  agent: {
    email: string;
    fullName: string;
    agentPayoutGcashNumber: string | null;
    agentPayoutGcashAccountName: string | null;
  };
  matchedUser: { email: string; fullName: string } | null;
};

export async function getAgentReferralAdminRows(): Promise<AgentReferralAdminRow[]> {
  const rows = await prisma.agentReferralSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 250,
    include: {
      agent: {
        select: {
          email: true,
          fullName: true,
          agentPayoutGcashNumber: true,
          agentPayoutGcashAccountName: true,
        },
      },
      matchedUser: { select: { email: true, fullName: true } },
    },
  } as Parameters<typeof prisma.agentReferralSubmission.findMany>[0]);
  return rows as AgentReferralAdminRow[];
}
