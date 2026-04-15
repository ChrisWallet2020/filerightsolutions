/** Strip spaces/dashes; return digits-only or empty. */
export function normalizeGcashMobileInput(raw: string): string {
  return raw.replace(/[\s-]/g, "").trim();
}

/** Philippine mobile format for GCash (09 + 9 digits). */
export function isValidGcashMobile(digits: string): boolean {
  return /^09\d{9}$/.test(digits);
}
