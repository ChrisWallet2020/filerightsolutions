import { prisma } from "@/lib/db";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isGlobalEmailPaused(): boolean {
  return (process.env.EMAIL_PAUSED_ALL || "").trim().toLowerCase() === "true";
}

export function maxScheduledAttempts(): number {
  const n = Number(process.env.EMAIL_MAX_ATTEMPTS || "6");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

export function maxScheduledBatchSize(): number {
  const n = Number(process.env.EMAIL_SCHEDULED_BATCH_SIZE || "25");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 25;
}

export function retryDelayMinutesForAttempt(attemptNumber: number): number {
  // Exponential backoff with cap: 2,4,8,16,32,60...
  const exp = Math.min(60, 2 ** Math.max(1, attemptNumber));
  return exp;
}

export async function isSuppressedEmail(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return true;
  const row = await prisma.emailSuppression.findUnique({
    where: { email: e },
    select: { active: true },
  });
  return Boolean(row?.active);
}

export async function addSuppression(email: string, reason: string, source = "system"): Promise<void> {
  const e = normalizeEmail(email);
  if (!e) return;
  await prisma.emailSuppression.upsert({
    where: { email: e },
    update: {
      active: true,
      reason: reason.slice(0, 500),
      source: source.slice(0, 100),
    },
    create: {
      email: e,
      reason: reason.slice(0, 500),
      source: source.slice(0, 100),
      active: true,
    },
  });
}
