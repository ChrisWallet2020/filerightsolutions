import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { setProcessor1Credentials } from "@/lib/siteSettings";

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "").trim();
  if (!username || !password) {
    return NextResponse.redirect(new URL("/admin?error=processor1_credentials_required", req.url), 303);
  }
  await setProcessor1Credentials(username, password);
  return NextResponse.redirect(new URL("/admin?saved=processor1_credentials", req.url), 303);
}
