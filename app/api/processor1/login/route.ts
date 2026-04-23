import { NextResponse } from "next/server";
import { setProcessor1SessionForUser } from "@/lib/auth";
import { verifyProcessorLogin } from "@/lib/processorUsers";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const username = String(form.get("username") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const user = await verifyProcessorLogin({ role: "processor1", username, password });
    if (!user) {
      return NextResponse.redirect(new URL("/processor1_dashboard/login?error=invalid", req.url));
    }
    setProcessor1SessionForUser(user.id);
    return NextResponse.redirect(new URL("/processor1_dashboard/evaluations", req.url));
  } catch {
    return NextResponse.redirect(new URL("/processor1_dashboard/login?error=server", req.url));
  }
}
