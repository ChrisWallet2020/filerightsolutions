import { prisma } from "@/lib/db";

/**
 * Marks referral credits complete for any referred user who already has a SUBMITTED evaluation.
 * Fixes rows where evaluation.referralEventId was never set or submit ran before that logic shipped.
 */
export async function syncReferralCreditsFromSubmittedEvaluations(): Promise<number> {
  const submitted = await prisma.evaluation.findMany({
    where: { status: "SUBMITTED" },
    select: { userId: true },
  });
  const referredIds = [...new Set(submitted.map((e) => e.userId))];
  if (referredIds.length === 0) return 0;

  const result = await prisma.referralEvent.updateMany({
    where: {
      evaluationCompleted: false,
      referredUserId: { in: referredIds },
    },
    data: { evaluationCompleted: true },
  });

  return result.count;
}
