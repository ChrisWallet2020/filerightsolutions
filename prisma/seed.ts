import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.servicePackage.createMany({
    data: [
      {
        name: "Annual Income Tax Filing Assistance (BIR Form 1701A)",
        description: "Preparation assistance and filing guidance for JO/COS annual income tax return.",
        inclusions: "Document review; computation; evaluation of eligible legal deductions (if applicable); preparation assistance; filing guidance",
        exclusions: "Government taxes/penalties/fees; BIR submission on your behalf unless separately agreed",
        turnaround: "Estimated 2–5 business days after complete documents are received",
        pricePhp: 1500
      },
      {
        name: "Amended Return Assistance (OSD / Corrections, if eligible)",
        description: "Assistance in preparing amended filing and evaluating eligibility for lawful deductions such as OSD.",
        inclusions: "Review; recomputation; eligibility evaluation; amended return preparation guidance",
        exclusions: "Government payments; audit representation; guaranteed outcomes",
        turnaround: "Estimated 3–7 business days after complete documents are received",
        pricePhp: 2500
      },
      {
        name: "Tax Review & Computation (Pre-filing Evaluation)",
        description: "Review your filing inputs and compute expected tax obligations under applicable rules.",
        inclusions: "Computation; evaluation of applicable filing options; guidance notes",
        exclusions: "BIR submission; guaranteed reductions",
        turnaround: "Estimated 1–3 business days after complete documents are received",
        pricePhp: 900
      }
    ]
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });