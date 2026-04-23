import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { sendBillingQuoteToUserEmail } from "@/lib/admin/sendBillingQuote";
import {
  markBulkEmailJobFinished,
  setBulkEmailSchedulerActive,
  tryStartNextBulkEmailJob,
} from "@/lib/admin/bulkEmailScheduler";

const SITE_KEY = "quote_send_all_job_v1";
const BATCH_SIZE = 2;
const activeRunners = new Set<string>();

export type SendAllQuotesJobState = {
  id: string;
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  pendingEmails: string[];
  /** Emails already handled in this job (sent, skipped, or failed); used to dedupe stacked batches. */
  processedEmails: string[];
  /** FIFO: each POST while running appends one batch, processed after current pendingEmails drain. */
  queuedBatches: string[][];
  startedAt: string | null;
  updatedAt: string;
  finishedAt: string | null;
  lastError: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function defaultState(): SendAllQuotesJobState {
  return {
    id: "",
    status: "idle",
    total: 0,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    pendingEmails: [],
    processedEmails: [],
    queuedBatches: [],
    startedAt: null,
    updatedAt: nowIso(),
    finishedAt: null,
    lastError: "",
  };
}

/** Total work remaining for progress: processed + current pending + all queued batches. */
function recomputeTotal(state: SendAllQuotesJobState): number {
  const queuedSum = (state.queuedBatches ?? []).reduce((a, b) => a + b.length, 0);
  return state.processed + state.pendingEmails.length + queuedSum;
}

function normalizeEmailList(emails: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of emails) {
    const e = raw.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

function dedupeBatchAgainstJob(emails: string[], state: SendAllQuotesJobState): string[] {
  const blocked = new Set<string>();
  for (const e of state.processedEmails ?? []) blocked.add(e);
  for (const e of state.pendingEmails) blocked.add(e);
  for (const batch of state.queuedBatches ?? []) {
    for (const e of batch) blocked.add(e);
  }
  return normalizeEmailList(emails.filter((e) => !blocked.has(e.trim().toLowerCase())));
}

function parseState(raw: string | null | undefined): SendAllQuotesJobState {
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Partial<SendAllQuotesJobState>;
    if (!parsed || typeof parsed !== "object") return defaultState();
    const rawBatches: unknown[] = Array.isArray(parsed.queuedBatches) ? parsed.queuedBatches : [];
    const queuedBatches = rawBatches
      .filter(Array.isArray)
      .map((b) =>
        normalizeEmailList(
          (b as unknown[]).filter((v): v is string => typeof v === "string"),
        ),
      )
      .filter((b) => b.length > 0);
    const processedEmails = Array.isArray(parsed.processedEmails)
      ? normalizeEmailList(parsed.processedEmails.filter((v): v is string => typeof v === "string"))
      : [];
    const pendingEmails = Array.isArray(parsed.pendingEmails)
      ? normalizeEmailList(parsed.pendingEmails.filter((v): v is string => typeof v === "string"))
      : [];
    const base: SendAllQuotesJobState = {
      id: typeof parsed.id === "string" ? parsed.id : "",
      status:
        parsed.status === "running" || parsed.status === "done" || parsed.status === "error" ? parsed.status : "idle",
      total: Number.isFinite(parsed.total) ? Math.max(0, Math.floor(parsed.total || 0)) : 0,
      processed: Number.isFinite(parsed.processed) ? Math.max(0, Math.floor(parsed.processed || 0)) : 0,
      sent: Number.isFinite(parsed.sent) ? Math.max(0, Math.floor(parsed.sent || 0)) : 0,
      skipped: Number.isFinite(parsed.skipped) ? Math.max(0, Math.floor(parsed.skipped || 0)) : 0,
      failed: Number.isFinite(parsed.failed) ? Math.max(0, Math.floor(parsed.failed || 0)) : 0,
      pendingEmails,
      processedEmails,
      queuedBatches,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
      finishedAt: typeof parsed.finishedAt === "string" ? parsed.finishedAt : null,
      lastError: typeof parsed.lastError === "string" ? parsed.lastError : "",
    };
    return { ...base, total: recomputeTotal(base) };
  } catch {
    return defaultState();
  }
}

async function upsertJobState(
  tx: Pick<typeof prisma, "siteSetting">,
  state: SendAllQuotesJobState,
): Promise<void> {
  const normalized = { ...state, total: recomputeTotal(state) };
  await tx.siteSetting.upsert({
    where: { key: SITE_KEY },
    create: { key: SITE_KEY, value: JSON.stringify(normalized) },
    update: { value: JSON.stringify(normalized) },
  });
}

async function saveState(state: SendAllQuotesJobState): Promise<void> {
  await upsertJobState(prisma, state);
}

export async function getSendAllQuotesJobState(): Promise<SendAllQuotesJobState> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: SITE_KEY },
    select: { value: true },
  });
  return parseState(row?.value);
}

export async function startSendAllQuotesJob(emails: string[]): Promise<SendAllQuotesJobState> {
  const cleanEmails = normalizeEmailList(emails);

  return await prisma.$transaction(async (tx) => {
    const row = await tx.siteSetting.findUnique({
      where: { key: SITE_KEY },
      select: { value: true },
    });
    const current = parseState(row?.value);

    if (current.status === "running") {
      const deduped = dedupeBatchAgainstJob(cleanEmails, current);
      if (deduped.length < 1) {
        return current;
      }
      const next: SendAllQuotesJobState = {
        ...current,
        queuedBatches: [...(current.queuedBatches ?? []), deduped],
        updatedAt: nowIso(),
      };
      next.total = recomputeTotal(next);
      await upsertJobState(tx, next);
      return next;
    }

    const next: SendAllQuotesJobState = {
      id: randomUUID(),
      status: "running",
      total: 0,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      pendingEmails: cleanEmails,
      processedEmails: [],
      queuedBatches: [],
      startedAt: nowIso(),
      updatedAt: nowIso(),
      finishedAt: null,
      lastError: "",
    };
    next.total = recomputeTotal(next);
    await upsertJobState(tx, next);
    await setBulkEmailSchedulerActive("quotes_send_all");
    return next;
  });
}

function classifyResult(result: Awaited<ReturnType<typeof sendBillingQuoteToUserEmail>>) {
  if (!result.ok && result.code === "attachments_incomplete") {
    return { sent: 0, skipped: 1, failed: 0 };
  }
  if (!result.ok) {
    return { sent: 0, skipped: 0, failed: 1 };
  }
  if (result.emailSent) {
    return { sent: 1, skipped: 0, failed: 0 };
  }
  if (result.emailError) {
    return { sent: 0, skipped: 0, failed: 1 };
  }
  return { sent: 0, skipped: 1, failed: 0 };
}

function drainNextPending(
  pending: string[],
  queued: string[][],
): { pending: string[]; queued: string[][] } {
  let p = pending;
  let q = [...queued];
  while (p.length < 1 && q.length > 0) {
    const raw = q.shift()!;
    const nextBatch = normalizeEmailList(raw);
    if (nextBatch.length > 0) {
      p = nextBatch;
      break;
    }
  }
  return { pending: p, queued: q };
}

export async function runSendAllQuotesJob(jobId: string): Promise<void> {
  while (true) {
    const state = await getSendAllQuotesJobState();
    if (state.id !== jobId || state.status !== "running") return;
    if (state.pendingEmails.length < 1) {
      const { pending, queued } = drainNextPending(state.pendingEmails, state.queuedBatches ?? []);
      if (pending.length < 1) {
        const done: SendAllQuotesJobState = {
          ...state,
          pendingEmails: [],
          queuedBatches: [],
          status: "done",
          updatedAt: nowIso(),
          finishedAt: nowIso(),
        };
        done.total = recomputeTotal(done);
        await saveState(done);
        await markBulkEmailJobFinished("quotes_send_all");
        await tryStartNextBulkEmailJob();
        return;
      }
      const continued: SendAllQuotesJobState = {
        ...state,
        pendingEmails: pending,
        queuedBatches: queued,
        updatedAt: nowIso(),
      };
      continued.total = recomputeTotal(continued);
      await saveState(continued);
      continue;
    }

    const batch = state.pendingEmails.slice(0, BATCH_SIZE);
    let sentInc = 0;
    let skippedInc = 0;
    let failedInc = 0;

    try {
      const results = await Promise.allSettled(
        batch.map((email) => sendBillingQuoteToUserEmail({ userEmail: email, clientNote: null })),
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          const tallied = classifyResult(r.value);
          sentInc += tallied.sent;
          skippedInc += tallied.skipped;
          failedInc += tallied.failed;
        } else {
          failedInc += 1;
        }
      }
    } catch {
      failedInc += batch.length;
    }

    const latest = await getSendAllQuotesJobState();
    if (latest.id !== jobId || latest.status !== "running") return;

    let pending = latest.pendingEmails.slice(batch.length);
    let queued = [...(latest.queuedBatches ?? [])];
    const processedEmails = normalizeEmailList([...(latest.processedEmails ?? []), ...batch]);

    if (pending.length < 1) {
      const drained = drainNextPending(pending, queued);
      pending = drained.pending;
      queued = drained.queued;
    }

    const updated: SendAllQuotesJobState = {
      ...latest,
      processed: latest.processed + batch.length,
      sent: latest.sent + sentInc,
      skipped: latest.skipped + skippedInc,
      failed: latest.failed + failedInc,
      pendingEmails: pending,
      queuedBatches: queued,
      processedEmails,
      updatedAt: nowIso(),
    };

    if (pending.length < 1) {
      updated.status = "done";
      updated.finishedAt = nowIso();
    }
    updated.total = recomputeTotal(updated);
    await saveState(updated);

    if (pending.length < 1) {
      await markBulkEmailJobFinished("quotes_send_all");
      await tryStartNextBulkEmailJob();
      return;
    }
  }
}

export async function failSendAllQuotesJob(jobId: string, error: unknown): Promise<void> {
  const state = await getSendAllQuotesJobState();
  if (state.id !== jobId || state.status !== "running") return;
  const msg = error instanceof Error ? error.message : String(error || "Unknown send-all error");
  const next = {
    ...state,
    status: "error" as const,
    updatedAt: nowIso(),
    finishedAt: nowIso(),
    lastError: msg.slice(0, 500),
  };
  next.total = recomputeTotal(next);
  await saveState(next);
  await markBulkEmailJobFinished("quotes_send_all");
  await tryStartNextBulkEmailJob();
}

export function kickSendAllQuotesJob(jobId: string): void {
  if (!jobId || activeRunners.has(jobId)) return;
  activeRunners.add(jobId);
  void runSendAllQuotesJob(jobId)
    .catch(async (error) => {
      await failSendAllQuotesJob(jobId, error);
    })
    .finally(() => {
      activeRunners.delete(jobId);
    });
}
