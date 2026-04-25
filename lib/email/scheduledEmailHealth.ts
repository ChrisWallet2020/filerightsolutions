import { prisma } from "@/lib/db";

export const DISPATCH_HEARTBEAT_KEY = "scheduled_dispatch_last_run_at";
export const WATCHDOG_HEARTBEAT_KEY = "scheduled_watchdog_last_run_at";
export const DISPATCH_LAST_STATS_KEY = "scheduled_dispatch_last_stats_json";

type QueueHealthOpts = {
  stuckAfterMinutes?: number;
};

export type ScheduledQueueHealth = {
  nowIso: string;
  pendingTotal: number;
  pendingDueNow: number;
  oldestPendingDueMinutes: number | null;
  stuckZeroAttemptCount: number;
  failedLast24h: number;
  sentLast24h: number;
  lastDispatchRunAt: string | null;
  lastWatchdogRunAt: string | null;
};

export async function getScheduledQueueHealth(opts: QueueHealthOpts = {}): Promise<ScheduledQueueHealth> {
  const now = new Date();
  const stuckAfterMinutes = Math.max(1, Math.floor(opts.stuckAfterMinutes ?? 10));
  const stuckBefore = new Date(now.getTime() - stuckAfterMinutes * 60_000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [pendingTotal, pendingDueNow, oldestPendingDue, stuckZeroAttemptCount, failedLast24h, sentLast24h, heartbeatRows] =
    await Promise.all([
      prisma.scheduledEmail.count({
        where: { sentAt: null, failedAt: null },
      }),
      prisma.scheduledEmail.count({
        where: {
          sentAt: null,
          failedAt: null,
          sendAt: { lte: now },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
      }),
      prisma.scheduledEmail.findFirst({
        where: {
          sentAt: null,
          failedAt: null,
          sendAt: { lte: now },
        },
        orderBy: [{ sendAt: "asc" }, { createdAt: "asc" }],
        select: { sendAt: true, createdAt: true },
      }),
      prisma.scheduledEmail.count({
        where: {
          sentAt: null,
          failedAt: null,
          attemptCount: 0,
          sendAt: { lte: now },
          createdAt: { lte: stuckBefore },
        },
      }),
      prisma.scheduledEmail.count({
        where: { failedAt: { gte: since24h }, sentAt: null },
      }),
      prisma.scheduledEmail.count({
        where: { sentAt: { gte: since24h } },
      }),
      prisma.siteSetting.findMany({
        where: { key: { in: [DISPATCH_HEARTBEAT_KEY, WATCHDOG_HEARTBEAT_KEY] } },
        select: { key: true, value: true },
      }),
    ]);

  const byKey = new Map(heartbeatRows.map((r) => [r.key, r.value]));
  const lastDispatchRaw = byKey.get(DISPATCH_HEARTBEAT_KEY) ?? null;
  const lastWatchdogRaw = byKey.get(WATCHDOG_HEARTBEAT_KEY) ?? null;

  const oldestRef = oldestPendingDue?.sendAt ?? oldestPendingDue?.createdAt ?? null;
  const oldestPendingDueMinutes = oldestRef ? Math.max(0, Math.floor((now.getTime() - oldestRef.getTime()) / 60000)) : null;

  return {
    nowIso: now.toISOString(),
    pendingTotal,
    pendingDueNow,
    oldestPendingDueMinutes,
    stuckZeroAttemptCount,
    failedLast24h,
    sentLast24h,
    lastDispatchRunAt: lastDispatchRaw,
    lastWatchdogRunAt: lastWatchdogRaw,
  };
}

export async function setSiteSettingJson(key: string, value: unknown): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

export async function setSiteSettingString(key: string, value: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
