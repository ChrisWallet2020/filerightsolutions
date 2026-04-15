import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, AGENT_SESSION_COOKIE, parseSignedSession } from "@/lib/session";
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return NextResponse.next();
    if (!(await hasValidAdminCookie(req))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
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
  matcher: ["/admin/:path*", "/agent-dashboard", "/agent-dashboard/:path*", "/agent/account", "/agent/account/:path*"],
};
