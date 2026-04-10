import { createHmac, timingSafeEqual } from "crypto";

/**
 * PayMongo signs webhooks as HMAC-SHA256(hex) of `${timestamp}.${rawBody}` using the webhook secret.
 * Header: comma-separated `key=value` pairs; includes `t` (timestamp) and one or more signature segments
 * (e.g. `te` / `li` in live vs test), matching paymongo-php WebhookService::constructEvent.
 * @see https://github.com/paymongo/paymongo-php/blob/development/src/Services/WebhookService.php
 */
function parseSignatureHeader(header: string): { t: string; signatures: string[] } {
  const signatures: string[] = [];
  let t = "";
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "t") t = val;
    else if (val.length > 0) signatures.push(val);
  }
  return { t, signatures };
}

function hexTimingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

const MAX_SIGNATURE_AGE_SEC = 600;

/**
 * Returns true when the signature matches PayMongo for this raw body and secret.
 */
export function verifyPaymongoWebhookSignature(
  rawBody: string,
  paymongoSignatureHeader: string | null,
  webhookSecret: string
): boolean {
  const secret = webhookSecret.trim();
  if (!secret || !paymongoSignatureHeader?.trim()) return false;

  const { t, signatures } = parseSignatureHeader(paymongoSignatureHeader.trim());
  if (!t || signatures.length === 0) return false;

  const ts = Number(t);
  if (Number.isFinite(ts) && ts > 0) {
    if (ts > 10_000_000_000) {
      if (Math.abs(Date.now() - ts) > MAX_SIGNATURE_AGE_SEC * 1000) return false;
    } else if (ts > 1_000_000_000) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - ts) > MAX_SIGNATURE_AGE_SEC) return false;
    }
  }

  const signedPayload = `${t}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  return signatures.some((sig) => hexTimingSafeEqual(expected, sig));
}
