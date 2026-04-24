import { prisma } from "@/lib/db";
import type { CollectedBillingImage } from "@/lib/admin/billingAttachments";

export type QuoteUploaderRole = "admin" | "processor1" | "processor2";

export type StagingSlotPublic = {
  slot: 1 | 2 | 3 | 4;
  present: boolean;
  filename?: string;
  uploadedBy?: string;
};

export type ActiveSubmissionContext = {
  submissionId: string;
  submittedAt: Date;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function assertSlotAllowedForRole(slot: number, role: QuoteUploaderRole) {
  if (role === "admin") return;
  if (role === "processor1" && (slot === 1 || slot === 2)) return;
  if (role === "processor2" && (slot === 3 || slot === 4)) return;
  throw new Error("slot_not_allowed");
}

export function normalizeQuoteClientEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export async function getActiveSubmissionContextForClientEmail(
  clientEmail: string
): Promise<ActiveSubmissionContext | null> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const latest = await prisma.evaluation1701ASubmission.findFirst({
    where: {
      user: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true },
  });
  if (!latest) return null;
  return { submissionId: latest.id, submittedAt: latest.createdAt };
}

async function deleteSupersededStagingRows(clientEmail: string, activeSubmissionId: string): Promise<void> {
  const email = normalizeQuoteClientEmail(clientEmail);
  await prisma.paymentQuoteImageStaging.deleteMany({
    where: {
      clientEmail: email,
      submissionId: { not: activeSubmissionId },
    },
  });
}

function normalizeUploadedFilename(raw: string) {
  return raw.trim().toLowerCase();
}

/** Latest DB write among this viewer's quote-image slots for the client (upload or save-over). */
export async function quoteImageStagingLastSavedAt(
  clientEmail: string,
  role: QuoteUploaderRole,
): Promise<Date | null> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) return null;
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const slotNums =
    role === "processor2" ? [3, 4] : role === "processor1" ? [1, 2] : [1, 2, 3, 4];
  const agg = await prisma.paymentQuoteImageStaging.aggregate({
    where: { clientEmail: email, submissionId: activeSubmission.submissionId, slot: { in: slotNums } },
    _max: { updatedAt: true },
  });
  return agg._max.updatedAt ?? null;
}

export async function deleteStagingForClientEmail(clientEmail: string) {
  const email = normalizeQuoteClientEmail(clientEmail);
  await prisma.paymentQuoteImageStaging.deleteMany({ where: { clientEmail: email } });
}

export async function saveStagingSlot(params: {
  clientEmail: string;
  slot: number;
  data: Buffer;
  filename: string;
  mimeType: string;
  uploadedBy: QuoteUploaderRole;
  /** Set when a signed-in processor uploads so send-time compensation credits the right actor. */
  uploadedByActorKey?: string | null;
}) {
  const email = normalizeQuoteClientEmail(params.clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) throw new Error("no_active_submission");
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  assertSlotAllowedForRole(params.slot, params.uploadedBy);
  if (params.slot < 1 || params.slot > 4) throw new Error("bad_slot");
  if (params.data.length > MAX_BYTES) throw new Error("too_large");
  const mt = params.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mt)) throw new Error("bad_mime");

  // Processor dashboards must keep distinct filenames across their 2-slot workspace.
  if (params.uploadedBy === "processor1" || params.uploadedBy === "processor2") {
    const peerSlot =
      params.uploadedBy === "processor1" ? (params.slot === 1 ? 2 : 1) : params.slot === 3 ? 4 : 3;
    const peer = await prisma.paymentQuoteImageStaging.findUnique({
      where: {
        clientEmail_submissionId_slot: {
          clientEmail: email,
          submissionId: activeSubmission.submissionId,
          slot: peerSlot,
        },
      },
      select: { filename: true },
    });
    if (
      peer?.filename &&
      normalizeUploadedFilename(peer.filename) === normalizeUploadedFilename(params.filename)
    ) {
      throw new Error("duplicate_workspace_filename");
    }
  }

  const actorKey =
    params.uploadedBy === "processor1" || params.uploadedBy === "processor2"
      ? (params.uploadedByActorKey?.trim() || null)
      : null;

  await prisma.paymentQuoteImageStaging.upsert({
    where: {
      clientEmail_submissionId_slot: {
        clientEmail: email,
        submissionId: activeSubmission.submissionId,
        slot: params.slot,
      },
    },
    create: {
      clientEmail: email,
      submissionId: activeSubmission.submissionId,
      slot: params.slot,
      data: params.data,
      filename: params.filename.slice(0, 500),
      mimeType: mt,
      uploadedBy: params.uploadedBy,
      uploadedByActorKey: actorKey,
    },
    update: {
      data: params.data,
      filename: params.filename.slice(0, 500),
      mimeType: mt,
      uploadedBy: params.uploadedBy,
      uploadedByActorKey: actorKey,
    },
  });
}

export async function listStagingSlotsForViewer(clientEmail: string): Promise<StagingSlotPublic[]> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) {
    return [1, 2, 3, 4].map((s) => ({ slot: s as 1 | 2 | 3 | 4, present: false }));
  }
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: { clientEmail: email, submissionId: activeSubmission.submissionId },
    select: { slot: true, filename: true, uploadedBy: true },
  });
  const bySlot = new Map(rows.map((r) => [r.slot, r]));
  const out: StagingSlotPublic[] = [];
  for (let s = 1; s <= 4; s++) {
    const row = bySlot.get(s);
    if (!row) {
      out.push({ slot: s as 1 | 2 | 3 | 4, present: false });
      continue;
    }
    out.push({
      slot: s as 1 | 2 | 3 | 4,
      present: true,
      filename: row.filename,
      uploadedBy: row.uploadedBy,
    });
  }
  return out;
}

export async function loadStagingSlotImage(params: { clientEmail: string; slot: number }) {
  const email = normalizeQuoteClientEmail(params.clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) throw new Error("not_found");
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  if (!Number.isInteger(params.slot) || params.slot < 1 || params.slot > 4) {
    throw new Error("bad_slot");
  }
  const row = await prisma.paymentQuoteImageStaging.findUnique({
    where: {
      clientEmail_submissionId_slot: {
        clientEmail: email,
        submissionId: activeSubmission.submissionId,
        slot: params.slot,
      },
    },
    select: { filename: true, mimeType: true, data: true },
  });
  if (!row) throw new Error("not_found");
  return {
    filename: row.filename,
    mimeType: row.mimeType,
    data: Buffer.from(row.data),
  };
}

export type PreviewSlotRow =
  | { slot: number; image: CollectedBillingImage }
  | { slot: number; missing: true };

/** Slots 1–2 for Processor1 dashboard, 3–4 for Processor2; admin requires all four. */
export async function isStagingReadyForSidePreview(
  clientEmail: string,
  role: QuoteUploaderRole,
): Promise<boolean> {
  const need: number[] =
    role === "processor2" ? [3, 4] : role === "processor1" ? [1, 2] : [1, 2, 3, 4];
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) return false;
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: { clientEmail: email, submissionId: activeSubmission.submissionId, slot: { in: need } },
    select: { slot: true },
  });
  const have = new Set(rows.map((r) => r.slot));
  return need.every((s) => have.has(s));
}

/** All four slots, with nulls for missing rows (preview HTML only). */
export async function loadStagingSlotsForPreview(clientEmail: string): Promise<PreviewSlotRow[]> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) {
    return [1, 2, 3, 4].map((s) => ({ slot: s, missing: true as const }));
  }
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: { clientEmail: email, submissionId: activeSubmission.submissionId },
    orderBy: { slot: "asc" },
  });
  const bySlot = new Map(rows.map((r) => [r.slot, r]));
  const out: PreviewSlotRow[] = [];
  for (let s = 1; s <= 4; s++) {
    const r = bySlot.get(s);
    if (r) {
      out.push({
        slot: s,
        image: {
          filename: r.filename,
          contentType: r.mimeType,
          content: Buffer.from(r.data),
        },
      });
    } else {
      out.push({ slot: s, missing: true });
    }
  }
  return out;
}

export async function isStagingComplete(clientEmail: string) {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) return false;
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: { clientEmail: email, submissionId: activeSubmission.submissionId },
    select: { slot: true },
  });
  const slots = new Set(rows.map((r) => r.slot));
  return [1, 2, 3, 4].every((s) => slots.has(s));
}

export async function isStagingCompleteForSendFromProcessors(clientEmail: string): Promise<boolean> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) return false;
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: {
      clientEmail: email,
      submissionId: activeSubmission.submissionId,
      slot: { in: [1, 2, 3, 4] },
    },
    select: { slot: true, uploadedBy: true },
  });
  const bySlot = new Map(rows.map((r) => [r.slot, r.uploadedBy]));
  return (
    bySlot.get(1) === "processor1" &&
    bySlot.get(2) === "processor1" &&
    bySlot.get(3) === "processor2" &&
    bySlot.get(4) === "processor2"
  );
}

export async function loadStagingImagesForSend(clientEmail: string): Promise<{
  submissionId: string;
  submittedAt: Date;
  images: CollectedBillingImage[];
  stagingRowIds: string[];
}> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) throw new Error("staging_incomplete");
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: { clientEmail: email, submissionId: activeSubmission.submissionId },
    orderBy: { slot: "asc" },
    select: { id: true, slot: true, filename: true, mimeType: true, data: true },
  });
  if (rows.length < 4) throw new Error("staging_incomplete");
  const bySlot = new Map(rows.map((r) => [r.slot, r]));
  const ordered: CollectedBillingImage[] = [];
  const rowIds: string[] = [];
  for (let s = 1; s <= 4; s++) {
    const r = bySlot.get(s);
    if (!r) throw new Error("staging_incomplete");
    rowIds.push(r.id);
    ordered.push({
      filename: r.filename,
      contentType: r.mimeType,
      content: Buffer.from(r.data),
    });
  }
  return {
    submissionId: activeSubmission.submissionId,
    submittedAt: activeSubmission.submittedAt,
    images: ordered,
    stagingRowIds: rowIds,
  };
}

export type StagingCompensationSlot = {
  slot: number;
  uploadedBy: string;
  uploadedByActorKey: string | null;
};

/**
 * Slot metadata for crediting processors after a quote email actually sends with attachments.
 * Call before `deleteStagingForClientEmail`.
 */
export async function loadStagingCompensationSlots(clientEmail: string): Promise<StagingCompensationSlot[]> {
  const email = normalizeQuoteClientEmail(clientEmail);
  const activeSubmission = await getActiveSubmissionContextForClientEmail(email);
  if (!activeSubmission) return [];
  await deleteSupersededStagingRows(email, activeSubmission.submissionId);
  const rows = await prisma.paymentQuoteImageStaging.findMany({
    where: {
      clientEmail: email,
      submissionId: activeSubmission.submissionId,
      slot: { in: [1, 2, 3, 4] },
    },
    orderBy: { slot: "asc" },
    select: { slot: true, uploadedBy: true, uploadedByActorKey: true },
  });
  return rows.map((r) => ({
    slot: r.slot,
    uploadedBy: r.uploadedBy,
    uploadedByActorKey: r.uploadedByActorKey,
  }));
}
