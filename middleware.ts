import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  AGENT_SESSION_COOKIE,
  PROCESSOR1_SESSION_COOKIE,
  PROCESSOR2_SESSION_COOKIE,
  parseSignedSession,
} from "@/lib/session";
import { SESSION_SECRET } from "@/lib/sessionSecret";

/**
 * Customer routes (/account, /api/evaluations/*) are not gated here.
 * Edge HMAC verification can disagree with Node (lib/auth) for the same cookie; API handlers
 * and server pages already call getAuthedUserId() in Node, which is authoritative.
 *
 * Admin routes still use middleware so the admin shell stays protected before render.
 */

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const keyData = new TextEncoder().encode(SESSION_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

async function hasValidAdminCookie(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(cookie);
  if (!parsed) return false;
  const expected = await sign(parsed.payload);
  return parsed.signature === expected;
}

async function hasValidAgentCookie(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(AGENT_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(cookie);
  if (!parsed) return false;
  const expected = await sign(parsed.payload);
  return parsed.signature === expected;
}

async function hasValidProcessor2Cookie(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(PROCESSOR2_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(cookie);
  if (!parsed) return false;
  const expected = await sign(parsed.payload);
  return parsed.signature === expected;
}

async function hasValidProcessor1Cookie(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(PROCESSOR1_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(cookie);
  if (!parsed) return false;
  const expected = await sign(parsed.payload);
  return parsed.signature === expected;
}

/** Legacy `/admin` URLs → canonical `/admin_dashboard` (App Router pages live under the latter). */
function redirectLegacyAdminToDashboard(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const u = req.nextUrl.clone();
    u.pathname = "/admin_dashboard" + pathname.slice("/admin".length);
    u.search = search;
    return NextResponse.redirect(u);
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const legacy = redirectLegacyAdminToDashboard(req);
  if (legacy) return legacy;

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin_dashboard")) {
    if (pathname.startsWith("/admin_dashboard/login")) return NextResponse.next();
    if (!(await hasValidAdminCookie(req))) {
      return NextResponse.redirect(new URL("/admin_dashboard/login" + req.nextUrl.search, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/processor1_dashboard")) {
    if (pathname.startsWith("/processor1_dashboard/login")) return NextResponse.next();
    if (!(await hasValidProcessor1Cookie(req))) {
      return NextResponse.redirect(new URL("/processor1_dashboard/login", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/processor2_dashboard")) {
    if (pathname.startsWith("/processor2_dashboard/login")) return NextResponse.next();
    if (!(await hasValidProcessor2Cookie(req))) {
      return NextResponse.redirect(new URL("/processor2_dashboard/login", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/agent-dashboard") || pathname.startsWith("/agent/account")) {
    if (!(await hasValidAgentCookie(req))) {
      const u = new URL("/agent/login", req.url);
      u.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(u);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/admin_dashboard",
    "/admin_dashboard/:path*",
    "/processor1_dashboard",
    "/processor1_dashboard/:path*",
    "/processor2_dashboard",
    "/processor2_dashboard/:path*",
    "/agent-dashboard",
    "/agent-dashboard/:path*",
    "/agent/account",
    "/agent/account/:path*",
  ],
};
