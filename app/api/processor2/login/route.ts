import { NextResponse } from "next/server";
import { setProcessor2Session } from "@/lib/auth";
import { getProcessor2Credentials } from "@/lib/siteSettings";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const creds = await getProcessor2Credentials();
    const isValid = username === creds.username && password === creds.password;
    if (!isValid) {
      return NextResponse.redirect(new URL("/processor2_dashboard/login?error=invalid", req.url));
    }
    setProcessor2Session(username);
    return NextResponse.redirect(new URL("/processor2_dashboard/evaluations", req.url));
  } catch {
    return NextResponse.redirect(new URL("/processor2_dashboard/login?error=server", req.url));
  }
}
