/**
 * Single source for HMAC signing. Edge middleware and Node auth must use the same value
 * as lib/config sessionSecret (fallback must match).
 */
export const SESSION_SECRET = process.env.SESSION_SECRET || "change_me_secret";
