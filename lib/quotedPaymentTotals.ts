import { config } from "@/lib/config";

/**
 * Quoted billing applies a single credit reduction when user has at least one confirmed credit.
 * Reduction is `referralFeeReductionPercent`% of base amount.
 */
export function computeQuotedPaymentTotals(baseAmountPhp: number, confirmedReferralCredits: number) {
  const base = Math.max(0, Math.floor(baseAmountPhp));
  const pct = Math.min(100, Math.max(0, config.referralFeeReductionPercent));
  const hasCredit = Math.max(0, Math.floor(confirmedReferralCredits)) >= 1;
  const rawDiscount = hasCredit ? Math.floor((base * pct) / 100) : 0;
  const discountPhp = Math.min(rawDiscount, base);
  const afterDiscount = Math.max(0, base - discountPhp);
  const minPay = Math.max(0, Math.floor(config.minQuotedPaymentPhp));
  const finalAmountPhp = Math.max(afterDiscount, minPay);

  return {
    baseAmountPhp: base,
    discountPhp,
    referralApplied: hasCredit && discountPhp > 0,
    creditCount: hasCredit ? 1 : 0,
    finalAmountPhp,
  };
}
