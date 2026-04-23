import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { isProcessor1Authed, isProcessor2Authed } from "@/lib/auth";
import { getProcessorToolById } from "@/lib/processorTools";

function isDownloadAllowed(targetRole: "processor1" | "processor2" | "both"): boolean {
  if (targetRole === "both") return isProcessor1Authed() || isProcessor2Authed();
  if (targetRole === "processor1") return isProcessor1Authed();
  return isProcessor2Authed();
}

export async function GET(_: Request, context: { params: { id: string } }) {
  const id = String(context.params.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const tool = await getProcessorToolById(id);
  if (!tool) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!isDownloadAllowed(tool.targetRole)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const fileBuffer = await fs.readFile(tool.storagePath).catch(() => null);
  if (!fileBuffer) {
    return NextResponse.json({ error: "missing_file" }, { status: 404 });
  }

  const fallback = path.basename(tool.filename || "download.bin");
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": tool.mimeType || "application/octet-stream",
      "Content-Length": String(fileBuffer.length),
      "Content-Disposition": `attachment; filename="${fallback.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
