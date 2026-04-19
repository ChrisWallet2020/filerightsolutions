/** Quote payment: legal notice first, then checkout summary (requires `ack=1`). */

export function clientPaymentNoticePath(quoteToken: string): string {
  return `/account/payment/notice?q=${encodeURIComponent(quoteToken)}`;
}

export function clientPaymentCheckoutPath(quoteToken: string): string {
  return `/account/payment?q=${encodeURIComponent(quoteToken)}&ack=1`;
}

export function paymentAcknowledged(searchParams: Record<string, string | string[] | undefined>): boolean {
  const raw = searchParams.ack;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "1" || v === "true";
}
