import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { createProcessorUser, deleteProcessorUser, type ProcessorRole } from "@/lib/processorUsers";

function parseRole(v: FormDataEntryValue | null): ProcessorRole | null {
  const s = String(v || "").trim();
  if (s === "processor1" || s === "processor2") return s;
  return null;
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.redirect(new URL("/admin_dashboard/login", req.url), 303);
  }
  const form = await req.formData();
  const intent = String(form.get("intent") || "").trim();
  if (intent === "delete") {
    const role = parseRole(form.get("role"));
    const id = String(form.get("id") || "").trim();
    if (!role || !id) {
      return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?error=invalid", req.url), 303);
    }
    const ok = await deleteProcessorUser({ role, id });
    if (!ok) {
      return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?error=missing", req.url), 303);
    }
    return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?saved=1", req.url), 303);
  }

  const role = parseRole(form.get("role"));
  const username = String(form.get("username") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!role) {
    return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?error=invalid", req.url), 303);
  }
  const created = await createProcessorUser({ role, username, password });
  if (!created.ok) {
    const error = created.code === "duplicate" ? "duplicate" : "invalid";
    return NextResponse.redirect(new URL(`/admin_dashboard/processor-accounts?error=${error}`, req.url), 303);
  }
  return NextResponse.redirect(new URL("/admin_dashboard/processor-accounts?saved=1", req.url), 303);
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const role = parseRole(url.searchParams.get("role"));
  const id = String(url.searchParams.get("id") || "").trim();
  if (!role || !id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const ok = await deleteProcessorUser({ role, id });
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
