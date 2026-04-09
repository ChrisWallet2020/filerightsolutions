import CryptoJS from "crypto-js";
import { config } from "../config";

/**
 * Placeholder verifier.
 * Replace with Dragonpay's exact checksum/signature spec once you have it.
 */
export function verifyDragonpayPayload(rawBody: string, providedSig: string | null): boolean {
  if (!config.dragonpay.secret) return false;
  if (!providedSig) return false;

  const computed = CryptoJS.HmacSHA256(rawBody, config.dragonpay.secret).toString();
  return computed === providedSig;
}