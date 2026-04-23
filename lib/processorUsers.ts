import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getProcessor1Credentials, getProcessor2Credentials } from "@/lib/siteSettings";

export type ProcessorRole = "processor1" | "processor2";

/** Synthetic user id when signing in with legacy workspace credentials (see `verifyProcessorLogin`). */
export function processorLegacySyntheticId(role: ProcessorRole): string {
  return `${role}_legacy`;
}

/** Ledger `processorRole` for that synthetic id — must match `getProcessor1SessionInfo` / `getProcessor2SessionInfo`. */
export function processorLegacyLedgerActorKey(role: ProcessorRole): string {
  return `${role}:${processorLegacySyntheticId(role)}`;
}

export type ProcessorUser = {
  id: string;
  username: string;
  passwordHash: string;
  passwordPlain: string;
  createdAt: string;
};

const P1_KEY = "PROCESSOR1_USERS_V1";
const P2_KEY = "PROCESSOR2_USERS_V1";

function keyFor(role: ProcessorRole): string {
  return role === "processor1" ? P1_KEY : P2_KEY;
}

function hashPassword(v: string): string {
  return crypto.createHash("sha256").update(v).digest("hex");
}

function safeParse(raw: string | null | undefined): ProcessorUser[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ProcessorUser[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const id = String(r.id || "").trim();
      const username = String(r.username || r.email || "").trim().toLowerCase();
      const passwordHash = String(r.passwordHash || "").trim();
      const passwordPlain = String(r.passwordPlain || "").trim();
      const createdAt = String(r.createdAt || "").trim();
      if (!id || !username || !passwordHash || !createdAt) continue;
      out.push({ id, username, passwordHash, passwordPlain, createdAt });
    }
    return out;
  } catch {
    return [];
  }
}

async function readUsers(role: ProcessorRole): Promise<ProcessorUser[]> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: keyFor(role) },
    select: { value: true },
  });
  return safeParse(row?.value);
}

async function writeUsers(role: ProcessorRole, rows: ProcessorUser[]): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: keyFor(role) },
    create: { key: keyFor(role), value: JSON.stringify(rows) },
    update: { value: JSON.stringify(rows) },
  });
}

function makeId(role: ProcessorRole): string {
  return `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function listProcessorUsers(role: ProcessorRole): Promise<ProcessorUser[]> {
  const rows = await readUsers(role);
  return rows.sort((a, b) => a.username.localeCompare(b.username, "en", { sensitivity: "base" }));
}

export async function getProcessorUsernameById(role: ProcessorRole, id: string): Promise<string | null> {
  const rows = await readUsers(role);
  const row = rows.find((r) => r.id === id);
  return row?.username ?? null;
}

export async function createProcessorUser(params: {
  role: ProcessorRole;
  username: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; code: "invalid" | "duplicate" }> {
  const username = params.username.trim().toLowerCase();
  const password = params.password;
  if (!username || !password || password.length < 6) return { ok: false, code: "invalid" };
  const rows = await readUsers(params.role);
  if (rows.some((r) => r.username === username)) return { ok: false, code: "duplicate" };
  rows.push({
    id: makeId(params.role),
    username,
    passwordHash: hashPassword(password),
    passwordPlain: password,
    createdAt: new Date().toISOString(),
  });
  await writeUsers(params.role, rows);
  return { ok: true };
}

export async function deleteProcessorUser(params: { role: ProcessorRole; id: string }): Promise<boolean> {
  const rows = await readUsers(params.role);
  const next = rows.filter((r) => r.id !== params.id);
  if (next.length === rows.length) return false;
  await writeUsers(params.role, next);
  return true;
}

/**
 * Verify login for processor employee accounts.
 * Backward-compatible fallback: allow legacy single credential username/password.
 */
export async function verifyProcessorLogin(params: {
  role: ProcessorRole;
  username: string;
  password: string;
}): Promise<{ id: string; username: string } | null> {
  const login = params.username.trim().toLowerCase();
  const passwordHash = hashPassword(params.password);
  const rows = await readUsers(params.role);
  const match = rows.find((r) => r.username === login && r.passwordHash === passwordHash);
  if (match) {
    return { id: match.id, username: match.username };
  }

  const legacy =
    params.role === "processor1" ? await getProcessor1Credentials() : await getProcessor2Credentials();
  const legacyLogin = (legacy.username || "").trim().toLowerCase();
  const legacyPass = legacy.password || "";
  if (login === legacyLogin && params.password === legacyPass) {
    const id = processorLegacySyntheticId(params.role);
    return { id, username: legacyLogin || id };
  }
  return null;
}
