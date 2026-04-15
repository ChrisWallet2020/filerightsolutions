import { prisma } from "@/lib/db";

function makeToken(): string {
  return `AG${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Unique code for agent signup links (`/register?agentRef=`). Separate from `User.referralCode` (client friend-referral / payable credit). */
export async function generateUniqueAgentReferralLinkCode(): Promise<string> {
  let code = makeToken();
  for (let i = 0; i < 24; i++) {
    const clash = await prisma.user.findFirst({
      where: { agentReferralLinkCode: code },
      select: { id: true },
    });
    if (!clash) return code;
    code = makeToken();
  }
  return `${makeToken()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`.slice(0, 14);
}
