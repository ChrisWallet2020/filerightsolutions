/**
 * Ops: delete all PENDING orders and related rows; keep PAID.
 * Run: node scripts/delete-pending-orders.cjs
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PENDING = "PENDING";

async function main() {
  const pending = await prisma.order.findMany({
    where: { status: PENDING },
    select: { id: true, orderId: true, customerEmail: true },
  });

  if (pending.length === 0) {
    console.log("No PENDING orders found.");
    return;
  }

  console.log(
    `Removing ${pending.length} PENDING order(s):`,
    pending.map((o) => `${o.orderId} (${o.customerEmail})`).join(", ")
  );

  const ids = pending.map((o) => o.id);

  await prisma.$transaction([
    prisma.paymentQuote.updateMany({
      where: { resultOrderDbId: { in: ids } },
      data: { resultOrderDbId: null, status: "OPEN" },
    }),
    prisma.payment.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.upload.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.emailLog.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.order.deleteMany({ where: { id: { in: ids } } }),
  ]);

  const remaining = await prisma.order.findMany({ select: { orderId: true, status: true } });
  console.log("Remaining orders:", remaining.length ? remaining : "(none)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
