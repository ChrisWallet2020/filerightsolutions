/**
 * BIR Form 1701A (January 2018 ENCS) — Part IV line items for evaluation capture.
 * Dual columns A) Taxpayer/Filer and B) Spouse — aligned with the official schedule layout.
 */

export const PART4_ZERO = "0.00";

export type Part4RowDef = { no: number; label: string };

export type Part4SectionDef = {
  id: string;
  subtitle: string;
  rows: Part4RowDef[];
};

/** Ordered sections and rows (item numbers match Part IV of Form 1701A). */
export const PART4_SECTIONS: Part4SectionDef[] = [
  {
    id: "IV.A",
    subtitle: "IV.A — For Graduated Income Tax Rates",
    rows: [
      { no: 36, label: "Sales / Revenues / Receipts / Fees" },
      { no: 37, label: "Less: Sales Returns, Allowances and Discounts" },
      { no: 38, label: "Net Sales / Revenues / Receipts / Fees" },
      { no: 39, label: "Less: Allowable Deduction - Optional Standard Deduction (OSD)" },
      { no: 40, label: "Net Income" },
      { no: 41, label: "Add: Other Income — row 1" },
      { no: 42, label: "Add: Other Income — row 2" },
      { no: 43, label: "Amount Received / Share in Income by Partner from GPP" },
      { no: 44, label: "Total Other Income" },
      { no: 45, label: "Total Taxable Income" },
      { no: 46, label: "TAX DUE" },
    ],
  },
  {
    id: "IV.B",
    subtitle: "IV.B — For 8% Income Tax Rate",
    rows: [
      { no: 47, label: "Sales / Revenues / Receipts / Fees" },
      { no: 48, label: "Less: Sales Returns, Allowances and Discounts" },
      { no: 49, label: "Net Sales / Revenues / Receipts / Fees" },
      { no: 50, label: "Add: Other Non-Operating Income - row 1" },
      { no: 51, label: "Add: Other Non-Operating Income - row 2" },
      { no: 52, label: "Total Other Non-operating Income" },
      { no: 53, label: "Total Taxable Income" },
      { no: 54, label: "Less: Allowable reduction from gross sales / receipts and non-operating income" },
      { no: 55, label: "Taxable Income (Loss)" },
      { no: 56, label: "TAX DUE" },
    ],
  },
  {
    id: "IV.C",
    subtitle: "IV.C — Tax Credits / Payments",
    rows: [
      { no: 57, label: "Prior Year's Excess Credits" },
      { no: 58, label: "Tax Payments for the First Three (3) Quarters" },
      { no: 59, label: "Creditable Tax Withheld for the First Three (3) Quarters" },
      { no: 60, label: "Creditable Tax Withheld per BIR Form No. 2307 for the 4th Quarter" },
      { no: 61, label: "Total Paid in Return Previously Filed, if this is an Amended Return" },
      { no: 62, label: "Foreign Tax Credits, if applicable" },
      { no: 63, label: "Other Tax Credits / Payments" },
      { no: 64, label: "Total Tax Credits / Payments" },
    ],
  },
  {
    id: "IV.65",
    subtitle: "Net computation",
    rows: [
      {
        no: 65,
        label: "Net Tax Payable / (Overpayment) (Item 46 or 56 Less Item 64) — (To Part II)",
      },
    ],
  },
];

export function defaultPart4(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const sec of PART4_SECTIONS) {
    for (const r of sec.rows) {
      o[`${r.no}A`] = PART4_ZERO;
      o[`${r.no}B`] = PART4_ZERO;
    }
  }
  return o;
}

export function mergePart4FromSaved(parsed: Record<string, unknown> | null): Record<string, string> {
  const def = defaultPart4();
  const raw = parsed?.part4;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const incoming = raw as Record<string, unknown>;
    for (const k of Object.keys(def)) {
      if (k in incoming && incoming[k] != null) {
        def[k] = String(incoming[k]);
      }
    }
  }
  return def;
}
