import { prisma } from "@/lib/db";

const HIGH_VOLUME_KEY = "EVALUATIONS_HIGH_VOLUME";
const DEADLINE_PASSED_KEY = "EVALUATIONS_DEADLINE_PASSED";
const SALES_FEES_MIN_KEY = "EVALUATION_SALES_FEES_MIN";
const SALES_FEES_MAX_KEY = "EVALUATION_SALES_FEES_MAX";

function normalizeLimitInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const out = raw.trim();
  return out ? out : null;
}

export async function isHighVolumeEnabled(): Promise<boolean> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: HIGH_VOLUME_KEY },
    select: { value: true },
  });
  return row?.value === "true";
}

export async function setHighVolumeEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  await prisma.siteSetting.upsert({
    where: { key: HIGH_VOLUME_KEY },
    create: { key: HIGH_VOLUME_KEY, value },
    update: { value },
  });
}

export async function isDeadlinePassedEnabled(): Promise<boolean> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: DEADLINE_PASSED_KEY },
    select: { value: true },
  });
  return row?.value === "true";
}

export async function setDeadlinePassedEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  await prisma.siteSetting.upsert({
    where: { key: DEADLINE_PASSED_KEY },
    create: { key: DEADLINE_PASSED_KEY, value },
    update: { value },
  });
}

export async function getSalesFeesLimits(): Promise<{ min: string | null; max: string | null }> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [SALES_FEES_MIN_KEY, SALES_FEES_MAX_KEY] } },
    select: { key: true, value: true },
  });

  let min: string | null = null;
  let max: string | null = null;
  for (const row of rows) {
    if (row.key === SALES_FEES_MIN_KEY) min = normalizeLimitInput(row.value);
    if (row.key === SALES_FEES_MAX_KEY) max = normalizeLimitInput(row.value);
  }

  return { min, max };
}

export async function setSalesFeesLimits(min: string | null, max: string | null): Promise<void> {
  const minValue = normalizeLimitInput(min) ?? "";
  const maxValue = normalizeLimitInput(max) ?? "";

  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: SALES_FEES_MIN_KEY },
      create: { key: SALES_FEES_MIN_KEY, value: minValue },
      update: { value: minValue },
    }),
    prisma.siteSetting.upsert({
      where: { key: SALES_FEES_MAX_KEY },
      create: { key: SALES_FEES_MAX_KEY, value: maxValue },
      update: { value: maxValue },
    }),
  ]);
}
