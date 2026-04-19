/**
 * Reply-To for outbound mail: explicit per-send wins, then `RESEND_REPLY_TO`, then `SUPPORT_EMAIL`.
 */
export function resolveMailReplyTo(explicitFromCaller?: string | null): string {
  const explicit = (explicitFromCaller ?? "").trim();
  if (explicit) return explicit;
  const fromEnv = (process.env.RESEND_REPLY_TO || "").trim();
  if (fromEnv) return fromEnv;
  return (process.env.SUPPORT_EMAIL || "support@filerightsolutions.com").trim();
}
