import { prisma } from "@/lib/db";

const SCHEDULER_KEY = "bulk_email_scheduler_v1";

export type BulkJobType = "quotes_send_all" | "reminders_send_all";

export type BulkEmailSchedulerState = {
  activeJobType: BulkJobType | null;
  queue: BulkJobType[];
  updatedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function defaultState(): BulkEmailSchedulerState {
  return {
    activeJobType: null,
    queue: [],
    updatedAt: nowIso(),
  };
}

function normalizeQueue(input: unknown): BulkJobType[] {
  if (!Array.isArray(input)) return [];
  const out: BulkJobType[] = [];
  for (const v of input) {
    if (v !== "quotes_send_all" && v !== "reminders_send_all") continue;
    if (out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

function parseState(raw: string | null | undefined): BulkEmailSchedulerState {
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Partial<BulkEmailSchedulerState>;
    const activeJobType =
      parsed.activeJobType === "quotes_send_all" || parsed.activeJobType === "reminders_send_all"
        ? parsed.activeJobType
        : null;
    return {
      activeJobType,
      queue: normalizeQueue(parsed.queue),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
    };
  } catch {
    return defaultState();
  }
}

async function saveState(state: BulkEmailSchedulerState): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: SCHEDULER_KEY },
    create: { key: SCHEDULER_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

export async function getBulkEmailSchedulerState(): Promise<BulkEmailSchedulerState> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: SCHEDULER_KEY },
    select: { value: true },
  });
  return parseState(row?.value);
}

export async function setBulkEmailSchedulerActive(activeJobType: BulkJobType | null): Promise<BulkEmailSchedulerState> {
  const current = await getBulkEmailSchedulerState();
  const next: BulkEmailSchedulerState = {
    ...current,
    activeJobType,
    updatedAt: nowIso(),
  };
  await saveState(next);
  return next;
}

export async function enqueueBulkEmailJob(type: BulkJobType): Promise<BulkEmailSchedulerState> {
  const current = await getBulkEmailSchedulerState();
  if (current.activeJobType === type || current.queue.includes(type)) {
    return current;
  }
  const next: BulkEmailSchedulerState = {
    ...current,
    queue: [...current.queue, type],
    updatedAt: nowIso(),
  };
  await saveState(next);
  return next;
}

export async function dequeueBulkEmailJob(type: BulkJobType): Promise<BulkEmailSchedulerState> {
  const current = await getBulkEmailSchedulerState();
  const nextQueue = current.queue.filter((x) => x !== type);
  if (nextQueue.length === current.queue.length) return current;
  const next: BulkEmailSchedulerState = {
    ...current,
    queue: nextQueue,
    updatedAt: nowIso(),
  };
  await saveState(next);
  return next;
}

export async function markBulkEmailJobFinished(type: BulkJobType): Promise<void> {
  const current = await getBulkEmailSchedulerState();
  const next: BulkEmailSchedulerState = {
    ...current,
    activeJobType: current.activeJobType === type ? null : current.activeJobType,
    updatedAt: nowIso(),
  };
  await saveState(next);
}

export async function tryStartNextBulkEmailJob(): Promise<BulkEmailSchedulerState> {
  const current = await getBulkEmailSchedulerState();
  if (current.activeJobType) return current;
  const [nextType, ...rest] = current.queue;
  if (!nextType) return current;

  const started: BulkEmailSchedulerState = {
    activeJobType: nextType,
    queue: rest,
    updatedAt: nowIso(),
  };
  await saveState(started);

  if (nextType === "quotes_send_all") {
    const { getSendAllQuotesJobState, kickSendAllQuotesJob } = await import("@/lib/admin/sendAllQuotesJob");
    const quoteJob = await getSendAllQuotesJobState();
    if (quoteJob.status === "running" && quoteJob.id) {
      kickSendAllQuotesJob(quoteJob.id);
    } else {
      await markBulkEmailJobFinished("quotes_send_all");
    }
    return getBulkEmailSchedulerState();
  }

  const { getReminderSendAllJobState, kickReminderSendAllJob, startReminderSendAllJob } = await import(
    "@/lib/admin/sendAllReminderEmailsJob"
  );
  const reminderJob = await getReminderSendAllJobState();
  if (reminderJob.status === "running" && reminderJob.id) {
    kickReminderSendAllJob(reminderJob.id);
    return getBulkEmailSchedulerState();
  }
  const startedReminder = await startReminderSendAllJob();
  kickReminderSendAllJob(startedReminder.id);
  return getBulkEmailSchedulerState();
}
