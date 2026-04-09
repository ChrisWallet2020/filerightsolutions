import { config } from "../config";

export function buildDragonpayRedirectUrl(orderId: string, amountPhp: number) {
  // Placeholder: Replace with actual Dragonpay redirect URL building
  // For now, just send user to a "status" page that says pending.
  const url = new URL(`${config.baseUrl}/payment/status`);
  url.searchParams.set("orderId", orderId);
  url.searchParams.set("state", "PENDING");
  return url.toString();
}