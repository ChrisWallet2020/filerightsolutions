import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { setAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");

    const isValid =
      email === config.adminEmail.toLowerCase() && password === config.adminPassword;

    if (!isValid) {
      return NextResponse.redirect(new URL("/admin/login?error=invalid", req.url));
    }

    setAdminSession(email);
    return NextResponse.redirect(new URL("/admin/orders", req.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=server", req.url));
  }
}
