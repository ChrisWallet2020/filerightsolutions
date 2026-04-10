import { NextRequest, NextResponse } from "next/server";
import { LOGIN_RETURN_TO_COOKIE, safePostLoginPath } from "@/lib/postLoginRedirect";

const returnCookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 600,
};

/**
 * Stores the post-login destination in an httpOnly cookie, then redirects to a clean /login URL.
 * Avoids relying on long `next=` query strings (often stripped by proxies, clients, or caches).
 */
export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get("next") || "";
  const validated = safePostLoginPath(nextParam);

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  const res = NextResponse.redirect(loginUrl);
  if (validated) {
    res.cookies.set(LOGIN_RETURN_TO_COOKIE, validated, returnCookieOpts);
  }
  return res;
}
