import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { createProcessorTool, deleteProcessorToolById, type ProcessorToolRole } from "@/lib/processorTools";

function parseRole(v: FormDataEntryValue | null): ProcessorToolRole | null {
  const s = String(v || "").trim().toLowerCase();
  if (s === "processor1" || s === "processor2" || s === "both") return s;
  return null;
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.redirect(new URL("/admin_dashboard/login", req.url), 303);
  }
  const form = await req.formData();
  const intent = String(form.get("intent") || "").trim().toLowerCase();

  if (intent === "delete") {
    const id = String(form.get("id") || "").trim();
    if (!id) {
      return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolError=invalid", req.url), 303);
    }
    const ok = await deleteProcessorToolById(id);
    if (!ok) {
      return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolError=missing", req.url), 303);
    }
    return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolSaved=1", req.url), 303);
  }

  const targetRole = parseRole(form.get("targetRole"));
  const file = form.get("file");
  if (!targetRole || !(file instanceof File)) {
    return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolError=invalid", req.url), 303);
  }
  if (file.size < 1) {
    return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolError=empty", req.url), 303);
  }
  if (file.size > 150 * 1024 * 1024) {
    return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolError=too_large", req.url), 303);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await createProcessorTool({
    targetRole,
    originalFilename: file.name || "download.bin",
    mimeType: file.type || "application/octet-stream",
    data: bytes,
  });
  return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?toolSaved=1", req.url), 303);
}
