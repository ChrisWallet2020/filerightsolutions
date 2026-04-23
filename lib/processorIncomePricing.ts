import { prisma } from "@/lib/db";

const KEY_IMAGE = "PROCESSOR_INCOME_PHP_PER_QUOTE_IMAGE";
const KEY_FILING = "PROCESSOR2_INCOME_PHP_PER_FILING_EMAIL";

function parseNonNegativeInt(raw: string | undefined): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export type ProcessorIncomePricing = {
  quoteImageUploadPhp: number;
  filingEmailPhp: number;
};

export async function getProcessorIncomePricing(): Promise<ProcessorIncomePricing> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [KEY_IMAGE, KEY_FILING] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    quoteImageUploadPhp: parseNonNegativeInt(map.get(KEY_IMAGE)),
    filingEmailPhp: parseNonNegativeInt(map.get(KEY_FILING)),
  };
}

export async function setProcessorIncomePricing(pricing: ProcessorIncomePricing): Promise<void> {
  const img = Math.max(0, Math.floor(Number(pricing.quoteImageUploadPhp) || 0));
  const mail = Math.max(0, Math.floor(Number(pricing.filingEmailPhp) || 0));
  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: KEY_IMAGE },
      create: { key: KEY_IMAGE, value: String(img) },
      update: { value: String(img) },
    }),
    prisma.siteSetting.upsert({
      where: { key: KEY_FILING },
      create: { key: KEY_FILING, value: String(mail) },
      update: { value: String(mail) },
    }),
  ]);
}
