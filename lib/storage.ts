import fs from "fs/promises";
import path from "path";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function evaluationsDir(): string {
  // Stores PDFs locally. In production, you can later swap this to S3/Wasabi.
  return path.join(process.cwd(), "storage", "evaluations");
}

export function safePdfFilename(prefix: string, id: string) {
  return `${prefix}-${id}.pdf`;
}