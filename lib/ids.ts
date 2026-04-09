import crypto from "crypto";

/**
 * Public-facing orderId (human-friendly-ish).
 * Example: TX-20260216-8F3K2J9Q
 */
export function generatePublicOrderId(prefix = "TX"): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  // 8-char base32-ish token
  const raw = crypto.randomBytes(6).toString("base64url").toUpperCase(); // ~8 chars
  const token = raw.replace(/[^A-Z0-9]/g, "X").slice(0, 8);

  return `${prefix}-${yyyy}${mm}${dd}-${token}`;
}

/**
 * Upload token should be long + unguessable.
 */
export function generateUploadToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}