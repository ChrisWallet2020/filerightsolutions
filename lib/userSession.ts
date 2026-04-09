import crypto from "crypto";
import { cookies } from "next/headers";
import { config } from "./config";

const COOKIE_NAME = "tax_site_user";

function hmac(data: string): string {
  return crypto.createHmac("sha256", config.sessionSecret).update(data).digest("hex");
}

export function setUserSession(email: string) {
  const value = `${email}.${hmac(email)}`;
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearUserSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function getAuthedUserEmail(): string | null {
  const v = cookies().get(COOKIE_NAME)?.value || "";
  const [email, sig] = v.split(".");
  if (!email || !sig) return null;
  if (sig !== hmac(email)) return null;
  return email;
}