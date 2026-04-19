import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin_dashboard")) return NextResponse.next();

  // allow login page
  if (pathname.startsWith("/admin_dashboard/login")) return NextResponse.next();

  const cookie = req.cookies.get("tax_site_admin")?.value || "";
  const parts = cookie.split(".");
  if (parts.length !== 2) {
    return NextResponse.redirect(new URL("/admin_dashboard/login", req.url));
  }
  // we validate signature server-side in route handlers too; middleware is a cheap gate
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin_dashboard/:path*"]
};