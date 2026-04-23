import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getPaidUserIdSet } from "@/lib/admin/paidUserIds";
import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";
import { sendMail } from "@/lib/email/mailer";
import { markBulkEmailJobFinished, tryStartNextBulkEmailJob } from "@/lib/admin/bulkEmailScheduler";

const SITE_KEY = "reminder_send_all_job_v1";
const BATCH_SIZE = 10;
const activeRunners = new Set<string>();

export type ReminderSendAllJobState = {
  id: string;
  status: "idle" | "queued" | "running" | "done" | "error";
  total: number;
  processed: number;
  sent: number;
  failed: number;
  skippedPaid: number;
  pendingUserIds: string[];
  processedUserIds: string[];
  startedAt: string | null;
  updatedAt: string;
  finishedAt: string | null;
  lastError: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function defaultState(): ReminderSendAllJobState {
  return {
    id: "",
    status: "idle",
    total: 0,
    processed: 0,
    sent: 0,
    failed: 0,
    skippedPaid: 0,
    pendingUserIds: [],
    processedUserIds: [],
    startedAt: null,
    updatedAt: nowIso(),
    finishedAt: null,
    lastError: "",
  };
}

function normalizeIdList(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of ids) {
    if (typeof v !== "string") continue;
    const id = v.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function parseState(raw: string | null | undefined): ReminderSendAllJobState {
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Partial<ReminderSendAllJobState>;
    return {
      id: typeof parsed.id === "string" ? parsed.id : "",
      status:
        parsed.status === "queued" || parsed.status === "running" || parsed.status === "done" || parsed.status === "error"
          ? parsed.status
          : "idle",
      total: Number.isFinite(parsed.total) ? Math.max(0, Math.floor(parsed.total || 0)) : 0,
      processed: Number.isFinite(parsed.processed) ? Math.max(0, Math.floor(parsed.processed || 0)) : 0,
      sent: Number.isFinite(parsed.sent) ? Math.max(0, Math.floor(parsed.sent || 0)) : 0,
      failed: Number.isFinite(parsed.failed) ? Math.max(0, Math.floor(parsed.failed || 0)) : 0,
      skippedPaid: Number.isFinite(parsed.skippedPaid) ? Math.max(0, Math.floor(parsed.skippedPaid || 0)) : 0,
      pendingUserIds: normalizeIdList(parsed.pendingUserIds),
      processedUserIds: normalizeIdList(parsed.processedUserIds),
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
      finishedAt: typeof parsed.finishedAt === "string" ? parsed.finishedAt : null,
      lastError: typeof parsed.lastError === "string" ? parsed.lastError : "",
    };
  } catch {
    return defaultState();
  }
}

async function saveState(state: ReminderSendAllJobState): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: SITE_KEY },
    create: { key: SITE_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

export async function getReminderSendAllJobState(): Promise<ReminderSendAllJobState> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: SITE_KEY },
    select: { value: true },
  });
  return parseState(row?.value);
}

async function listCandidateCustomerUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((x) => x.id);
}

export async function queueReminderSendAllJob(): Promise<ReminderSendAllJobState> {
  const current = await getReminderSendAllJobState();
  if (current.status === "queued" || current.status === "running") return current;
  const pendingUserIds = await listCandidateCustomerUserIds();
  const queued: ReminderSendAllJobState = {
    id: randomUUID(),
    status: "queued",
    total: pendingUserIds.length,
    processed: 0,
    sent: 0,
    failed: 0,
    skippedPaid: 0,
    pendingUserIds,
    processedUserIds: [],
    startedAt: null,
    updatedAt: nowIso(),
    finishedAt: null,
    lastError: "",
  };
  await saveState(queued);
  return queued;
}

export async function startReminderSendAllJob(): Promise<ReminderSendAllJobState> {
  const current = await getReminderSendAllJobState();
  if (current.status === "running") return current;
  const pendingUserIds = current.status === "queued" && current.pendingUserIds.length > 0
    ? current.pendingUserIds
    : await listCandidateCustomerUserIds();
  const next: ReminderSendAllJobState = {
    id: current.id || randomUUID(),
    status: "running",
    total: pendingUserIds.length,
    processed: 0,
    sent: 0,
    failed: 0,
    skippedPaid: 0,
    pendingUserIds,
    processedUserIds: [],
    startedAt: nowIso(),
    updatedAt: nowIso(),
    finishedAt: null,
    lastError: "",
  };
  await saveState(next);
  return next;
}

export async function runReminderSendAllJob(jobId: string): Promise<void> {
  while (true) {
    const state = await getReminderSendAllJobState();
    if (state.id !== jobId || state.status !== "running") return;
    if (state.pendingUserIds.length < 1) {
      const done: ReminderSendAllJobState = {
        ...state,
        status: "done",
        updatedAt: nowIso(),
        finishedAt: nowIso(),
      };
      await saveState(done);
      await markBulkEmailJobFinished("reminders_send_all");
      await tryStartNextBulkEmailJob();
      return;
    }

    const batchIds = state.pendingUserIds.slice(0, BATCH_SIZE);
    const paidSet = await getPaidUserIdSet();
    let sentInc = 0;
    let failInc = 0;
    let skippedPaidInc = 0;

    for (const userId of batchIds) {
      try {
        if (paidSet.has(userId)) {
          skippedPaidInc += 1;
          continue;
        }
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, fullName: true },
        });
        const toEmail = user?.email?.trim().toLowerCase() || "";
        if (!toEmail) {
          failInc += 1;
          continue;
        }
        const tpl = await renderClientEmailTemplate("BIR_1701A_DEADLINE_REMINDER", {
          clientName: user?.fullName || "Client",
        });
        await sendMail(toEmail, tpl.subject, tpl.textBody, tpl.htmlBody);
        sentInc += 1;
      } catch (err) {
        failInc += 1;
      }
    }

    const latest = await getReminderSendAllJobState();
    if (latest.id !== jobId || latest.status !== "running") return;
    const processedUserIds = normalizeIdList([...(latest.processedUserIds || []), ...batchIds]);
    const pendingUserIds = latest.pendingUserIds.slice(batchIds.length);
    const updated: ReminderSendAllJobState = {
      ...latest,
      processed: latest.processed + batchIds.length,
      sent: latest.sent + sentInc,
      failed: latest.failed + failInc,
      skippedPaid: latest.skippedPaid + skippedPaidInc,
      pendingUserIds,
      processedUserIds,
      updatedAt: nowIso(),
    };
    if (pendingUserIds.length < 1) {
      updated.status = "done";
      updated.finishedAt = nowIso();
    }
    await saveState(updated);

    if (pendingUserIds.length < 1) {
      await markBulkEmailJobFinished("reminders_send_all");
      await tryStartNextBulkEmailJob();
      return;
    }
  }
}

export async function failReminderSendAllJob(jobId: string, error: unknown): Promise<void> {
  const state = await getReminderSendAllJobState();
  if (state.id !== jobId || state.status !== "running") return;
  const msg = error instanceof Error ? error.message : String(error || "Unknown reminder send-all error");
  const failed: ReminderSendAllJobState = {
    ...state,
    status: "error",
    updatedAt: nowIso(),
    finishedAt: nowIso(),
    lastError: msg.slice(0, 500),
  };
  await saveState(failed);
  await markBulkEmailJobFinished("reminders_send_all");
  await tryStartNextBulkEmailJob();
}

export function kickReminderSendAllJob(jobId: string): void {
  if (!jobId || activeRunners.has(jobId)) return;
  activeRunners.add(jobId);
  void runReminderSendAllJob(jobId)
    .catch(async (error) => {
      await failReminderSendAllJob(jobId, error);
    })
    .finally(() => {
      activeRunners.delete(jobId);
    });
}
