import { NextResponse } from "next/server";
import { setProcessor2SessionForUser } from "@/lib/auth";
import { verifyProcessorLogin } from "@/lib/processorUsers";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const username = String(form.get("username") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const user = await verifyProcessorLogin({ role: "processor2", username, password });
    if (!user) {
      return NextResponse.redirect(new URL("/processor2_dashboard/login?error=invalid", req.url));
    }
    setProcessor2SessionForUser(user.id);
    return NextResponse.redirect(new URL("/processor2_dashboard/evaluations", req.url));
  } catch {
    return NextResponse.redirect(new URL("/processor2_dashboard/login?error=server", req.url));
  }
}
