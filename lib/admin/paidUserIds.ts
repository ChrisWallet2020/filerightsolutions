import { prisma } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/constants";

/** Users who have at least one PAID order (via billing quote or matching order customer email). */
export async function getPaidUserIdSet(): Promise<Set<string>> {
  const ids = new Set<string>();

  const quoteRows = await prisma.paymentQuote.findMany({
    where: { resultOrder: { status: ORDER_STATUS.PAID } },
    select: { userId: true },
  });
  for (const r of quoteRows) ids.add(r.userId);

  const orders = await prisma.order.findMany({
    where: { status: ORDER_STATUS.PAID },
    select: { customerEmail: true },
  });
  const emails = [
    ...new Set(orders.map((o) => o.customerEmail.trim().toLowerCase()).filter(Boolean)),
  ];
  if (emails.length === 0) return ids;

  const users = await prisma.user.findMany({
    where: { OR: emails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })) },
    select: { id: true },
  });
  for (const u of users) ids.add(u.id);

  return ids;
}
