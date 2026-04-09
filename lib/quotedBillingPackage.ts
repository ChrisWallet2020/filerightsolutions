import { prisma } from "@/lib/db";

const QUOTED_CODE = "QUOTED_BILLING";

/** Package row used only for quoted / admin-set fees (amount lives on Order.amountPhp). */
export async function getQuotedBillingPackageId(): Promise<string> {
  const existing = await prisma.servicePackage.findFirst({
    where: { code: QUOTED_CODE },
    select: { id: true },
  });
  if (existing) return existing.id;

  const row = await prisma.servicePackage.create({
    data: {
      code: QUOTED_CODE,
      name: "Quoted service fee (as advised)",
      description: "Fee set by the office for your matter after manual review.",
      inclusions: "Per your billing instructions and engagement letter (if any).",
      exclusions: "Government taxes, penalties, and BIR filing fees",
      turnaround: "Per engagement timeline",
      pricePhp: 0,
      isActive: false,
    },
    select: { id: true },
  });
  return row.id;
}
