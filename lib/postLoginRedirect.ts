import type { NextRequest } from "next/server";

/**
 * Allow only same-site relative paths after login (mitigate open redirects).
 * Accepts paths like /account/payment or /account/payment?q=token.
 */
export function safePostLoginPath(next: string | null | undefined): string | null {
  if (next == null) return null;
  const t = String(next).trim();
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  if (t.includes("\\")) return null;
  if (t.includes("@")) return null;
  return t;
}

/**
 * Build an absolute URL on the current host from a validated internal path + query.
 * Prefer this over `new URL(path, req.url)` in Route Handlers (avoids odd `req.url` bases on some hosts).
 */
export function absoluteUrlForInternalPath(request: NextRequest, internalPathWithQuery: string): URL {
  const trimmed = internalPathWithQuery.trim();
  const u = request.nextUrl.clone();
  const q = trimmed.indexOf("?");
  u.pathname = (q === -1 ? trimmed : trimmed.slice(0, q)) || "/";
  const qs = q === -1 ? "" : trimmed.slice(q + 1);
  u.search = qs ? `?${qs}` : "";
  u.hash = "";
  return u;
}
