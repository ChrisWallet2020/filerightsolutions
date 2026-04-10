import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { applyUserSessionToResponse } from "@/lib/auth";
import {
  absoluteUrlForInternalPath,
  LOGIN_RETURN_TO_COOKIE,
  safePostLoginPath,
} from "@/lib/postLoginRedirect";

function loginUrlWithError(request: NextRequest, code: string, preserveNext?: string | null) {
  const u = request.nextUrl.clone();
  u.pathname = "/login";
  u.search = "";
  u.searchParams.set("error", code);
  if (preserveNext) {
    const n = safePostLoginPath(preserveNext);
    if (n) u.searchParams.set("next", n);
  }
  return u;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const nextRaw = String(form.get("next") || "").trim();
    const nextPath = safePostLoginPath(nextRaw);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.redirect(loginUrlWithError(request, "invalid", nextPath));

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.redirect(loginUrlWithError(request, "invalid", nextPath));

    const jar = cookies();
    const cookieRaw = jar.get(LOGIN_RETURN_TO_COOKIE)?.value;
    const fromCookie = cookieRaw ? safePostLoginPath(cookieRaw) : null;
    const to = fromCookie || nextPath || "/account";

    const res = NextResponse.redirect(absoluteUrlForInternalPath(request, to));
    applyUserSessionToResponse(res, user.id);
    res.cookies.set(LOGIN_RETURN_TO_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    const u = request.nextUrl.clone();
    u.pathname = "/login";
    u.search = "";
    u.searchParams.set("error", "server");
    return NextResponse.redirect(u);
  }
}