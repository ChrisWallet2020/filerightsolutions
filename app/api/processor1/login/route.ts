import { NextResponse } from "next/server";
import { setProcessor1Session } from "@/lib/auth";
import { getProcessor1Credentials } from "@/lib/siteSettings";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const creds = await getProcessor1Credentials();
    const isValid = username === creds.username && password === creds.password;
    if (!isValid) {
      return NextResponse.redirect(new URL("/processor1_dashboard/login?error=invalid", req.url));
    }
    setProcessor1Session(username);
    return NextResponse.redirect(new URL("/processor1_dashboard/evaluations", req.url));
  } catch {
    return NextResponse.redirect(new URL("/processor1_dashboard/login?error=server", req.url));
  }
}
