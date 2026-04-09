import { prisma } from "@/lib/db";

const HIGH_VOLUME_KEY = "EVALUATIONS_HIGH_VOLUME";
const DEADLINE_PASSED_KEY = "EVALUATIONS_DEADLINE_PASSED";
const SALES_FEES_MIN_KEY = "EVALUATION_SALES_FEES_MIN";
const SALES_FEES_MAX_KEY = "EVALUATION_SALES_FEES_MAX";

async function ensureSiteSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SiteSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function isHighVolumeEnabled(): Promise<boolean> {
  await ensureSiteSettingsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `SELECT "value" FROM "SiteSetting" WHERE "key" = ? LIMIT 1`,
    HIGH_VOLUME_KEY
  );
  return rows[0]?.value === "true";
}

export async function setHighVolumeEnabled(enabled: boolean): Promise<void> {
  await ensureSiteSettingsTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "SiteSetting" ("key", "value", "createdAt", "updatedAt")
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT("key") DO UPDATE SET
        "value" = excluded."value",
        "updatedAt" = CURRENT_TIMESTAMP
    `,
    HIGH_VOLUME_KEY,
    enabled ? "true" : "false"
  );
}

export async function isDeadlinePassedEnabled(): Promise<boolean> {
  await ensureSiteSettingsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `SELECT "value" FROM "SiteSetting" WHERE "key" = ? LIMIT 1`,
    DEADLINE_PASSED_KEY
  );
  return rows[0]?.value === "true";
}

export async function setDeadlinePassedEnabled(enabled: boolean): Promise<void> {
  await ensureSiteSettingsTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "SiteSetting" ("key", "value", "createdAt", "updatedAt")
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT("key") DO UPDATE SET
        "value" = excluded."value",
        "updatedAt" = CURRENT_TIMESTAMP
    `,
    DEADLINE_PASSED_KEY,
    enabled ? "true" : "false"
  );
}

function normalizeLimitInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const out = raw.trim();
  return out ? out : null;
}

export async function getSalesFeesLimits(): Promise<{ min: string | null; max: string | null }> {
  await ensureSiteSettingsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: string }>>(
    `SELECT "key", "value" FROM "SiteSetting" WHERE "key" IN (?, ?)`,
    SALES_FEES_MIN_KEY,
    SALES_FEES_MAX_KEY
  );

  let min: string | null = null;
  let max: string | null = null;
  for (const row of rows) {
    if (row.key === SALES_FEES_MIN_KEY) min = normalizeLimitInput(row.value);
    if (row.key === SALES_FEES_MAX_KEY) max = normalizeLimitInput(row.value);
  }

  return { min, max };
}

export async function setSalesFeesLimits(min: string | null, max: string | null): Promise<void> {
  await ensureSiteSettingsTable();
  const minValue = normalizeLimitInput(min) ?? "";
  const maxValue = normalizeLimitInput(max) ?? "";

  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `
        INSERT INTO "SiteSetting" ("key", "value", "createdAt", "updatedAt")
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT("key") DO UPDATE SET
          "value" = excluded."value",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      SALES_FEES_MIN_KEY,
      minValue
    ),
    prisma.$executeRawUnsafe(
      `
        INSERT INTO "SiteSetting" ("key", "value", "createdAt", "updatedAt")
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT("key") DO UPDATE SET
          "value" = excluded."value",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      SALES_FEES_MAX_KEY,
      maxValue
    ),
  ]);
}
