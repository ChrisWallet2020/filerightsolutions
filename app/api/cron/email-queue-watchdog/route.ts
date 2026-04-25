import { NextResponse } from "next/server";
import { processScheduledEmailsBatch } from "@/lib/email/processScheduledEmails";
import {
  WATCHDOG_HEARTBEAT_KEY,
  getScheduledQueueHealth,
  setSiteSettingString,
} from "@/lib/email/scheduledEmailHealth";

function isCronRequestAuthorized(req: Request): boolean {
  const configured = (process.env.CRON_KEY || process.env.CRON_SECRET || "").trim();
  if (!configured) return true;
  const headerKey = (req.headers.get("x-cron-key") || "").trim();
  if (headerKey && headerKey === configured) return true;
  const auth = (req.headers.get("authorization") || "").trim();
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1]?.trim() === configured);
}

function minutesSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 60000));
}

export async function POST(req: Request) {
  if (!isCronRequestAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const nowMs = Date.now();
  const before = await getScheduledQueueHealth({ stuckAfterMinutes: 10 });
  const dispatchLagMinutes = minutesSince(before.lastDispatchRunAt, nowMs);
  const shouldKickDispatch =
    before.pendingDueNow > 0 &&
    (before.stuckZeroAttemptCount > 0 || dispatchLagMinutes === null || dispatchLagMinutes > 5);

  let dispatch = null as null | Awaited<ReturnType<typeof processScheduledEmailsBatch>>;
  if (shouldKickDispatch) {
    dispatch = await processScheduledEmailsBatch();
  }

  await setSiteSettingString(WATCHDOG_HEARTBEAT_KEY, new Date().toISOString());
  const after = await getScheduledQueueHealth({ stuckAfterMinutes: 10 });

  return NextResponse.json({
    ok: true,
    shouldKickDispatch,
    dispatchLagMinutes,
    dispatch,
    before,
    after,
  });
}
