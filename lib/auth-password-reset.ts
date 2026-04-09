import crypto from "crypto";

export function createRawResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}