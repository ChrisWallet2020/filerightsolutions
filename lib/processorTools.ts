import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { prisma } from "@/lib/db";

const TOOLS_SITE_KEY = "PROCESSOR_TOOLS_V1";
const TOOLS_DIR = path.join(process.cwd(), "storage", "processor-tools");

export type ProcessorToolRole = "processor1" | "processor2" | "both";

export type ProcessorTool = {
  id: string;
  targetRole: ProcessorToolRole;
  filename: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function safeParse(raw: string | null | undefined): ProcessorTool[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ProcessorTool[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const id = String(r.id || "").trim();
      const targetRole = String(r.targetRole || "").trim() as ProcessorToolRole;
      const filename = String(r.filename || "").trim();
      const storedName = String(r.storedName || "").trim();
      const storagePath = String(r.storagePath || "").trim();
      const mimeType = String(r.mimeType || "application/octet-stream").trim();
      const sizeBytes = Number(r.sizeBytes || 0);
      const createdAt = String(r.createdAt || "").trim();
      if (!id || !filename || !storedName || !storagePath || !createdAt) continue;
      if (targetRole !== "processor1" && targetRole !== "processor2" && targetRole !== "both") continue;
      out.push({
        id,
        targetRole,
        filename,
        storedName,
        storagePath,
        mimeType,
        sizeBytes: Number.isFinite(sizeBytes) ? Math.max(0, Math.floor(sizeBytes)) : 0,
        createdAt,
      });
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

async function readTools(): Promise<ProcessorTool[]> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: TOOLS_SITE_KEY },
    select: { value: true },
  });
  return safeParse(row?.value);
}

async function writeTools(rows: ProcessorTool[]): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: TOOLS_SITE_KEY },
    create: { key: TOOLS_SITE_KEY, value: JSON.stringify(rows) },
    update: { value: JSON.stringify(rows) },
  });
}

function safeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()]/g, "_").trim();
  return base || "download.bin";
}

export async function listProcessorToolsForAdmin(): Promise<ProcessorTool[]> {
  return readTools();
}

export async function listProcessorToolsForRole(role: "processor1" | "processor2"): Promise<ProcessorTool[]> {
  const rows = await readTools();
  return rows.filter((row) => row.targetRole === "both" || row.targetRole === role);
}

export async function createProcessorTool(params: {
  targetRole: ProcessorToolRole;
  originalFilename: string;
  mimeType: string;
  data: Buffer;
}): Promise<ProcessorTool> {
  const cleanName = safeFilename(params.originalFilename);
  const ext = path.extname(cleanName);
  const id = `tool_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const storedName = `${id}${ext}`;
  const storagePath = path.join(TOOLS_DIR, storedName);

  await fs.mkdir(TOOLS_DIR, { recursive: true });
  await fs.writeFile(storagePath, params.data);

  const row: ProcessorTool = {
    id,
    targetRole: params.targetRole,
    filename: cleanName,
    storedName,
    storagePath,
    mimeType: params.mimeType.trim() || "application/octet-stream",
    sizeBytes: params.data.length,
    createdAt: new Date().toISOString(),
  };

  const current = await readTools();
  current.unshift(row);
  await writeTools(current);
  return row;
}

export async function getProcessorToolById(id: string): Promise<ProcessorTool | null> {
  const rows = await readTools();
  return rows.find((row) => row.id === id) ?? null;
}

export async function deleteProcessorToolById(id: string): Promise<boolean> {
  const rows = await readTools();
  const found = rows.find((row) => row.id === id);
  if (!found) return false;
  const next = rows.filter((row) => row.id !== id);
  await writeTools(next);
  await fs.unlink(found.storagePath).catch(() => {});
  return true;
}

