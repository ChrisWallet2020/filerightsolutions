import { prisma } from "@/lib/db";
import type { ProcessorCompensationRole } from "@/lib/processorCompensationLedger";

const PAYOUT_REQUESTS_KEY = "PROCESSOR_PAYOUT_REQUESTS_V1";

export type ProcessorPayoutRequestStatus = "pending" | "approved" | "rejected";

export type ProcessorPayoutRequest = {
  id: string;
  processorRole: ProcessorCompensationRole;
  requesterActorKey: string;
  requesterUsername: string;
  amountPhp: number;
  payoutMethod: "online_banking" | "e_wallet" | "";
  payoutProvider: string;
  payoutAccountName: string;
  payoutAccountNumber: string;
  status: ProcessorPayoutRequestStatus;
  requestedAt: string;
  processedAt: string | null;
  adminNote: string;
};

function toId(): string {
  return `payout_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeParse(raw: string | null | undefined): ProcessorPayoutRequest[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ProcessorPayoutRequest[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const status = String(r.status || "");
      const role = String(r.processorRole || "");
      if (role !== "processor1" && role !== "processor2") continue;
      if (status !== "pending" && status !== "approved" && status !== "rejected") continue;
      const amountPhp = Number(r.amountPhp);
      if (!Number.isFinite(amountPhp) || amountPhp < 0) continue;
      out.push({
        id: String(r.id || ""),
        processorRole: role,
        requesterActorKey: String(r.requesterActorKey || `${role}:${String(r.requesterUsername || "").trim()}`),
        requesterUsername: String(r.requesterUsername || ""),
        amountPhp: Math.floor(amountPhp),
        payoutMethod:
          r.payoutMethod === "online_banking" || r.payoutMethod === "e_wallet"
            ? (r.payoutMethod as "online_banking" | "e_wallet")
            : "",
        payoutProvider: String(r.payoutProvider || ""),
        payoutAccountName: String(r.payoutAccountName || ""),
        payoutAccountNumber: String(r.payoutAccountNumber || ""),
        status,
        requestedAt: String(r.requestedAt || ""),
        processedAt: r.processedAt ? String(r.processedAt) : null,
        adminNote: String(r.adminNote || ""),
      });
    }
    return out.filter((r) => r.id && r.requestedAt);
  } catch {
    return [];
  }
}

async function readAll(): Promise<ProcessorPayoutRequest[]> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: PAYOUT_REQUESTS_KEY },
    select: { value: true },
  });
  return safeParse(row?.value);
}

async function writeAll(rows: ProcessorPayoutRequest[]): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: PAYOUT_REQUESTS_KEY },
    create: { key: PAYOUT_REQUESTS_KEY, value: JSON.stringify(rows) },
    update: { value: JSON.stringify(rows) },
  });
}

export async function listProcessorPayoutRequests(
  role?: ProcessorCompensationRole,
  requesterActorKey?: string
): Promise<ProcessorPayoutRequest[]> {
  const rows = await readAll();
  const filtered = rows.filter((r) => {
    if (role && r.processorRole !== role) return false;
    if (requesterActorKey && r.requesterActorKey !== requesterActorKey) return false;
    return true;
  });
  return filtered.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function createProcessorPayoutRequest(params: {
  role: ProcessorCompensationRole;
  requesterActorKey: string;
  amountPhp: number;
  requesterUsername: string;
  payoutMethod: "online_banking" | "e_wallet" | "";
  payoutProvider: string;
  payoutAccountName: string;
  payoutAccountNumber: string;
}): Promise<ProcessorPayoutRequest> {
  const amountPhp = Math.max(0, Math.floor(params.amountPhp));
  if (!amountPhp) throw new Error("invalid_amount");
  const rows = await readAll();
  const next: ProcessorPayoutRequest = {
    id: toId(),
    processorRole: params.role,
    requesterActorKey: params.requesterActorKey.trim(),
    requesterUsername: params.requesterUsername.trim(),
    amountPhp,
    payoutMethod: params.payoutMethod,
    payoutProvider: params.payoutProvider.trim(),
    payoutAccountName: params.payoutAccountName.trim(),
    payoutAccountNumber: params.payoutAccountNumber.trim(),
    status: "pending",
    requestedAt: new Date().toISOString(),
    processedAt: null,
    adminNote: "",
  };
  rows.push(next);
  await writeAll(rows);
  return next;
}

export async function updateProcessorPayoutRequest(params: {
  id: string;
  status: "approved" | "rejected";
  adminNote?: string;
}): Promise<boolean> {
  const rows = await readAll();
  const idx = rows.findIndex((r) => r.id === params.id);
  if (idx < 0) return false;
  rows[idx] = {
    ...rows[idx],
    status: params.status,
    processedAt: new Date().toISOString(),
    adminNote: (params.adminNote || "").trim(),
  };
  await writeAll(rows);
  return true;
}

export function payoutBreakdown(rows: ProcessorPayoutRequest[]) {
  const approvedPhp = rows
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.amountPhp, 0);
  const pendingPhp = rows
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amountPhp, 0);
  const rejectedPhp = rows
    .filter((r) => r.status === "rejected")
    .reduce((sum, r) => sum + r.amountPhp, 0);
  return { approvedPhp, pendingPhp, rejectedPhp };
}
