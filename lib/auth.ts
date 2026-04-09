import crypto from "crypto";
import { cookies } from "next/headers";
import { config } from "./config";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, parseSignedSession } from "./session";

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

/* =========================
   CUSTOMER SESSION (Phase 1)
========================= */

export function setUserSession(userId: string) {
  const value = `${userId}.${sign(userId)}`;
  cookies().set(USER_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
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