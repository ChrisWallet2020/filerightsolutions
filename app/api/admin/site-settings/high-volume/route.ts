import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { isHighVolumeEnabled, setHighVolumeEnabled } from "@/lib/siteSettings";

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const enabled = await isHighVolumeEnabled();
  return NextResponse.json({ enabled });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  let enabled = false;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    enabled = Boolean(body?.enabled);
  } else {
    const form = await req.formData();
    enabled = String(form.get("enabled")) === "true";
  }

  await setHighVolumeEnabled(enabled);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, enabled });
  }

  return NextResponse.redirect(new URL("/admin/high-volume", req.url), 303);
}
