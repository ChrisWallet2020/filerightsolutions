/**
 * Match agent-entered names to registered customer full names when middle names may be omitted.
 */

export function normalizeNameTokens(raw: string): string[] {
  const s = raw
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(jr|sr|ii|iii)\b\.?/gi, "")
    .trim();
  return s
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** First and last tokens of input must equal first and last tokens of stored full name (case-insensitive). */
export function firstLastCompatible(inputTokens: string[], fullNameTokens: string[]): boolean {
  if (inputTokens.length < 2 || fullNameTokens.length < 2) return false;
  const i0 = inputTokens[0];
  const i1 = inputTokens[inputTokens.length - 1];
  const f0 = fullNameTokens[0];
  const f1 = fullNameTokens[fullNameTokens.length - 1];
  return i0 === f0 && i1 === f1;
}

/** Every agent token appears in order as whole tokens in the full name (handles omitted middle names). */
export function isOrderedSubsequence(inputTokens: string[], fullNameTokens: string[]): boolean {
  if (inputTokens.length === 0) return false;
  let j = 0;
  for (const t of inputTokens) {
    while (j < fullNameTokens.length && fullNameTokens[j] !== t) {
      j++;
    }
    if (j >= fullNameTokens.length) return false;
    j++;
  }
  return true;
}

export type NameMatchConfidence = "exact_norm" | "first_last" | "ordered_tokens";

export function scoreNameMatch(inputRaw: string, customerFullName: string): NameMatchConfidence | null {
  const input = normalizeNameTokens(inputRaw);
  const full = normalizeNameTokens(customerFullName);
  if (input.length < 2 || full.length < 2) return null;

  if (input.join(" ") === full.join(" ")) return "exact_norm";

  if (!firstLastCompatible(input, full)) return null;

  /* Two tokens: typical “Given Family” when our record includes middle names. */
  if (input.length === 2) return "first_last";

  /* Three or more: every typed token must appear in order on file (extra middles on file are OK). */
  if (isOrderedSubsequence(input, full)) return "ordered_tokens";

  return null;
}
