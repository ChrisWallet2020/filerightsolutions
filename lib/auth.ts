import crypto from "crypto";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { config } from "./config";
import {
  ADMIN_SESSION_COOKIE,
  AGENT_SESSION_COOKIE,
  PROCESSOR1_SESSION_COOKIE,
  PROCESSOR2_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  parseSignedSession,
} from "./session";

const PROCESSOR1_USER_SESSION_PREFIX = "p1u:";
const PROCESSOR2_USER_SESSION_PREFIX = "p2u:";

/* =========================
   ADMIN SESSION
========================= */

function sign(data: string): string {
  return crypto
    .createHmac("sha256", config.sessionSecret)
    .update(data)
    .digest("hex");
}

export function setAdminSession(email: string) {
  const value = `${email}.${sign(email)}`;
  cookies().set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearAdminSession() {
  cookies().set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function isAdminAuthed(): boolean {
  const raw = cookies().get(ADMIN_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return false;
  return parsed.payload === config.adminEmail && parsed.signature === sign(parsed.payload);
}

export function setProcessor1Session(username: string) {
  const value = `${username}.${sign(username)}`;
  cookies().set(PROCESSOR1_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function setProcessor1SessionForUser(userId: string) {
  const payload = `${PROCESSOR1_USER_SESSION_PREFIX}${userId}`;
  const value = `${payload}.${sign(payload)}`;
  cookies().set(PROCESSOR1_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearProcessor1Session() {
  cookies().set(PROCESSOR1_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function isProcessor1Authed(expectedUsername?: string): boolean {
  const raw = cookies().get(PROCESSOR1_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return false;
  if (parsed.signature !== sign(parsed.payload)) return false;
  if (parsed.payload.startsWith(PROCESSOR1_USER_SESSION_PREFIX)) return true;
  if (expectedUsername) return parsed.payload === expectedUsername;
  return true;
}

export function setProcessor2Session(username: string) {
  const value = `${username}.${sign(username)}`;
  cookies().set(PROCESSOR2_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function setProcessor2SessionForUser(userId: string) {
  const payload = `${PROCESSOR2_USER_SESSION_PREFIX}${userId}`;
  const value = `${payload}.${sign(payload)}`;
  cookies().set(PROCESSOR2_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearProcessor2Session() {
  cookies().set(PROCESSOR2_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function isProcessor2Authed(expectedUsername?: string): boolean {
  const raw = cookies().get(PROCESSOR2_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return false;
  if (parsed.signature !== sign(parsed.payload)) return false;
  if (parsed.payload.startsWith(PROCESSOR2_USER_SESSION_PREFIX)) return true;
  if (expectedUsername) return parsed.payload === expectedUsername;
  return true;
}

export function getProcessor1SessionInfo(): { userId: string | null; actorKey: string } | null {
  const raw = cookies().get(PROCESSOR1_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return null;
  if (parsed.signature !== sign(parsed.payload)) return null;
  if (parsed.payload.startsWith(PROCESSOR1_USER_SESSION_PREFIX)) {
    const userId = parsed.payload.slice(PROCESSOR1_USER_SESSION_PREFIX.length).trim();
    if (!userId) return null;
    return { userId, actorKey: `processor1:${userId}` };
  }
  return { userId: null, actorKey: "processor1" };
}

export function getProcessor2SessionInfo(): { userId: string | null; actorKey: string } | null {
  const raw = cookies().get(PROCESSOR2_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return null;
  if (parsed.signature !== sign(parsed.payload)) return null;
  if (parsed.payload.startsWith(PROCESSOR2_USER_SESSION_PREFIX)) {
    const userId = parsed.payload.slice(PROCESSOR2_USER_SESSION_PREFIX.length).trim();
    if (!userId) return null;
    return { userId, actorKey: `processor2:${userId}` };
  }
  return { userId: null, actorKey: "processor2" };
}

/* =========================
   CUSTOMER SESSION (Phase 1)
========================= */

const userSessionCookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export function setUserSession(userId: string) {
  const value = `${userId}.${sign(userId)}`;
  cookies().set(USER_SESSION_COOKIE, value, userSessionCookieOpts);
}

/** Use in Route Handlers when returning NextResponse.redirect so Set-Cookie is on the same response. */
export function applyUserSessionToResponse(response: NextResponse, userId: string) {
  const value = `${userId}.${sign(userId)}`;
  response.cookies.set(USER_SESSION_COOKIE, value, userSessionCookieOpts);
}

export function clearUserSession() {
  cookies().set(USER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getAuthedUserId(): string | null {
  const raw = cookies().get(USER_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return null;
  if (parsed.signature !== sign(parsed.payload)) return null;
  return parsed.payload;
}

/* =========================
   AGENT SESSION (external referrers)
========================= */

const agentSessionCookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export function setAgentSession(userId: string) {
  const value = `${userId}.${sign(userId)}`;
  cookies().set(AGENT_SESSION_COOKIE, value, agentSessionCookieOpts);
}

export function applyAgentSessionToResponse(response: NextResponse, userId: string) {
  const value = `${userId}.${sign(userId)}`;
  response.cookies.set(AGENT_SESSION_COOKIE, value, agentSessionCookieOpts);
}

export function clearAgentSession() {
  cookies().set(AGENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** Signed-in agent user id, or null if missing/invalid/not an agent account. */
export async function getAuthedAgentUserId(): Promise<string | null> {
  const raw = cookies().get(AGENT_SESSION_COOKIE)?.value || "";
  const parsed = parseSignedSession(raw);
  if (!parsed) return null;
  if (parsed.signature !== sign(parsed.payload)) return null;
  const user = await prisma.user.findUnique({
    where: { id: parsed.payload },
    select: { id: true, role: true, agentPortalEnabled: true },
  });
  if (!user) return null;
  if (user.role !== "AGENT" && !user.agentPortalEnabled) return null;
  return user.id;
}