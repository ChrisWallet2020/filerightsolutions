import { isAdminAuthed, isProcessor1Authed, isProcessor2Authed } from "@/lib/auth";
import type { QuoteUploaderRole } from "@/lib/admin/paymentQuoteStaging";

export const PROCESSOR1_QUOTE_PAGE_PATH = "/processor1_dashboard/quote";
export const PROCESSOR2_QUOTE_PAGE_PATH = "/processor2_dashboard/quote";
export const ADMIN_QUOTE_PAGE_PATH = "/admin_dashboard/quote";

/** Default return path when Referer does not identify a processor dashboard. */
export const PAYMENT_QUOTE_PAGE_PATH = PROCESSOR1_QUOTE_PAGE_PATH;

/** Where to send the browser after quote actions, based on which dashboard issued the request. */
export function paymentQuoteReturnUrl(req: Request): string {
  const ref = req.headers.get("referer") || "";
  if (ref.includes("/admin_dashboard")) return ADMIN_QUOTE_PAGE_PATH;
  if (ref.includes("/processor2_dashboard")) return PROCESSOR2_QUOTE_PAGE_PATH;
  return PROCESSOR1_QUOTE_PAGE_PATH;
}

/** Admin or signed-in Processor1 / Processor2 may create/send billing quotes. */
export async function isPaymentQuoteOperatorAuthed(): Promise<boolean> {
  if (isAdminAuthed()) return true;
  if (isProcessor1Authed()) return true;
  return isProcessor2Authed();
}

/**
 * Slot policy for quote image staging: driven by **which dashboard URL** the request comes from,
 * not by the admin cookie. Otherwise an admin session on `/processor1_dashboard/quote` would
 * incorrectly allow uploads to slots 3–4 (and the inverse on P2).
 */
export function quoteSlotRoleFromRequest(req: Request): QuoteUploaderRole {
  const h = (req.headers.get("x-quote-dashboard") || "").trim().toLowerCase();
  if (h === "admin") return "admin";
  if (h === "processor2" || h === "processor1") return h;
  const ref = req.headers.get("referer") || "";
  if (ref.includes("/admin_dashboard")) return "admin";
  if (ref.includes("/processor2_dashboard")) return "processor2";
  return "processor1";
}
