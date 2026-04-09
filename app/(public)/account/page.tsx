// app/(public)/account/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";
import AccountDashboardClient from "./AccountDashboardClient";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const userId = getAuthedUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  // Use latest evaluation state (draft/in-progress/submitted) for dashboard status.
  // If none exists yet, create one draft record.
  let evaluation = await prisma.evaluation.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { submission1701A: true },
  });

  if (!evaluation) {
    evaluation = await prisma.evaluation.create({
      data: { userId: user.id, status: "DRAFT" },
      include: { submission1701A: true },
    });
  }

  const referralLink = `${config.baseUrl}/register?ref=${user.referralCode}`;

  const credited = await prisma.referralEvent.count({
    where: { referrerId: user.id, evaluationCompleted: true },
  });

  const tab = searchParams.tab;
  const initialTab =
    tab === "evaluation" || tab === "referral" || tab === "overview" ? tab : undefined;

  return (
    <AccountDashboardClient
      userFullName={user.fullName}
      userEmail={user.email}
      evaluationId={evaluation.id}
      evaluationStatus={evaluation.status}
      existingPayloadJson={evaluation.submission1701A?.payloadJson || evaluation.payloadJson || null}
      referralLink={referralLink}
      credited={credited}
      initialTab={initialTab}
    />
  );
}