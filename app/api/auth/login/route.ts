import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setUserSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.redirect(new URL("/login?error=invalid", req.url));

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.redirect(new URL("/login?error=invalid", req.url));

    setUserSession(user.id);
    return NextResponse.redirect(new URL("/account", req.url));
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return NextResponse.redirect(new URL("/login?error=server", req.url));
  }
}