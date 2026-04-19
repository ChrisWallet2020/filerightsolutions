import type { Buffer } from "node:buffer";

/**
 * Next.js `NextResponse` expects Web `BodyInit`; Node `Buffer` is binary-compatible at runtime
 * but TS's DOM lib + Node `Buffer` generics disagree. Cast is safe for PDF/zip bytes.
 */
export function bufferAsResponseBody(buf: Buffer): BodyInit {
  return buf as unknown as BodyInit;
}
