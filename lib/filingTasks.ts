import { prisma } from "@/lib/db";
import { FILING_TASK_STATUS } from "@/lib/constants";

function defaultDueAt(paidAt: Date | null | undefined): Date {
  const base = paidAt ? new Date(paidAt) : new Date();
  base.setHours(base.getHours() + 24);
  return base;
}

/** Create/update the filing task whenever an order becomes paid. */
export async function ensureFilingTaskForPaidOrder(order: {
  id: string;
  paidAt?: Date | null;
}) {
  return prisma.filingTask.upsert({
    where: { orderId: order.id },
    update: {
      ...(order.paidAt ? { dueAt: defaultDueAt(order.paidAt) } : {}),
      ...(order.paidAt ? {} : { dueAt: defaultDueAt(null) }),
    },
    create: {
      orderId: order.id,
      status: FILING_TASK_STATUS.READY_TO_FILE,
      dueAt: defaultDueAt(order.paidAt),
    },
  });
}
