import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PART4_SECTIONS } from "@/lib/bir1701aPart4";

type AnyObj = Record<string, unknown>;

const PAGE_W = 612;
const PAGE_H = 792;
const M = 48;
const LINE_SMALL = 9;
const LINE = 11;
const TABLE_LINE = 9.5;
const MAX_W = PAGE_W - 2 * M;

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().replace(/₱/g, "PHP ");
}

function yn(v: unknown): string {
  const s = str(v).toUpperCase();
  if (s === "YES") return "Yes";
  if (s === "NO") return "No";
  return s ? s : "—";
}

function tin(p: AnyObj): string {
  const segs = [p.tin1, p.tin2, p.tin3, p.tin4].map((x) => str(x));
  if (segs.some((s) => s.length > 0)) return segs.join("-");
  return str(p.tin);
}

/** Match `normalizeInitial` in Bir1701AFormClient — PDF must not show blank name if only legacy name parts exist. */
function derivedTaxpayerName(p: AnyObj): string {
  if (str(p.taxpayerName)) return str(p.taxpayerName);
  const parts = [p.lastName, p.firstName, p.middleName].map((x) => str(x)).filter(Boolean);
  return parts.join(", ");
}

function taxpayerTypeLabel(v: unknown): string {
  if (v === "PROFESSIONAL") return "Professional";
  if (v === "SINGLE_PROP") return "Single Proprietor";
  return str(v) || "—";
}

function atcLabel(v: unknown): string {
  const m: Record<string, string> = {
    II012: "II012 — Business Income-Graduated IT Rates",
    II014: "II014 — Income from Profession-Graduated IT Rates",
    II015: "II015 — Business Income-8% IT Rate",
    II017: "II017 — Income from Profession-8% IT Rate",
  };
  const k = str(v);
  return m[k] || k || "—";
}

function civilLabel(v: unknown): string {
  const m: Record<string, string> = {
    SINGLE: "Single",
    MARRIED: "Married",
    LEGAL_SEP: "Legally Separated",
    WIDOW: "Widow/er",
  };
  const k = str(v);
  return m[k] || k || "—";
}

function taxRateLabel(v: unknown): string {
  if (v === "GRAD_OSD") return "Graduated Rates with OSD as method of deduction";
  if (v === "EIGHT_PERCENT")
    return "8% in lieu of Graduated Rates under Sec. 24(A) & Percentage Tax under Sec. 116 of the NIRC";
  return str(v) || "—";
}

function overpayLabel(v: unknown): string {
  const m: Record<string, string> = {
    REFUND: "To be refunded",
    TCC: "To be issued a Tax Credit Certificate (TCC)",
    CARRY_OVER: "To be carried over as a tax credit for next year/quarter",
  };
  const k = str(v);
  return m[k] || k || "—";
}

function part4Cell(p: AnyObj, no: number, side: "A" | "B"): string {
  const o = p.part4;
  const k = `${no}${side}`;
  if (o && typeof o === "object" && !Array.isArray(o) && k in o) {
    return str((o as Record<string, unknown>)[k]);
  }
  return "";
}

function hasPart4Object(p: AnyObj): boolean {
  return Boolean(p.part4 && typeof p.part4 === "object" && !Array.isArray(p.part4));
}

function drawPart4Sections(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  payload: AnyObj,
  sections: typeof PART4_SECTIONS,
  yStart: number
): number {
  let y = yStart;
  const noX = M;
  const labelX = M + 18;
  const aX = 290;
  const bX = 445;
  for (const sec of sections) {
    if (y < 86) break;
    page.drawText(str(sec.subtitle), { x: M, y, size: 8, font: fontBold });
    y -= 12;
    page.drawText("Particulars", { x: labelX, y, size: 7, font: fontBold });
    page.drawText("A) Filer", { x: aX, y, size: 7, font: fontBold });
    page.drawText("B) Spouse", { x: bX, y, size: 7, font: fontBold });
    y -= 10;
    for (const r of sec.rows) {
      if (y < 58) break;
      const a = part4Cell(payload, r.no, "A");
      const b = part4Cell(payload, r.no, "B");
      const rawLabel = str(r.label);
      const lab = rawLabel.length > 54 ? rawLabel.slice(0, 52) + "…" : rawLabel;
      page.drawText(String(r.no), { x: noX, y, size: 7, font: fontBold });
      page.drawText(lab, { x: labelX, y, size: 7, font });
      page.drawText(a || "0.00", { x: aX, y, size: 7, font });
      page.drawText(b || "0.00", { x: bX, y, size: 7, font });
      y -= 9;
    }
    y -= 3;
  }
  return y;
}

function wrapLine(font: PDFFont, text: string, size: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const tryLine = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(tryLine, size) <= MAX_W) {
      cur = tryLine;
    } else {
      if (cur) lines.push(cur);
      if (font.widthOfTextAtSize(w, size) <= MAX_W) cur = w;
      else {
        let chunk = "";
        for (const ch of w) {
          const t = chunk + ch;
          if (font.widthOfTextAtSize(t, size) <= MAX_W) chunk = t;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        cur = chunk;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  yStart: number,
  lineGap: number
): number {
  let y = yStart;
  for (const line of wrapLine(font, text, size)) {
    page.drawText(line, { x: M, y, size, font });
    y -= lineGap;
    if (y < 56) break;
  }
  return y;
}

function drawFormHeader(page: PDFPage, font: PDFFont, fontBold: PDFFont, pageNum: 1 | 2, yStart: number): number {
  let y = yStart;
  page.drawText("BIR Form No. 1701A — January 2018 (ENCS)", { x: M, y, size: 9, font });
  y -= 14;
  page.drawText("Annual Income Tax Return — Individuals (Business/Profession)", { x: M, y, size: 10, font: fontBold });
  y -= 14;
  page.drawText(`PAGE ${pageNum} OF 2 — Client evaluation copy (values as submitted)`, {
    x: M,
    y,
    size: 9,
    font,
  });
  y -= 18;
  page.drawLine({ start: { x: M, y: y + 8 }, end: { x: PAGE_W - M, y: y + 8 }, thickness: 0.5 });
  y -= 8;
  return y;
}

/** Portal submit ordinal for this evaluation (1 = first). Shown when &gt; 1. */
function drawResubmitNotice(
  page: PDFPage,
  font: PDFFont,
  yStart: number,
  submitOrdinal: number | null | undefined
): number {
  if (submitOrdinal == null || submitOrdinal <= 1) return yStart;
  const text = `Resubmission — portal submit #${submitOrdinal} of this evaluation`;
  page.drawText(text, {
    x: M,
    y: yStart,
    size: 8,
    font,
    color: rgb(0.72, 0.35, 0.05),
  });
  return yStart - 13;
}

function rowPair(page: PDFPage, font: PDFFont, label: string, value: string, y: number): number {
  const line = `${label}: ${value || "—"}`;
  let yy = y;
  for (const part of wrapLine(font, line, 8)) {
    page.drawText(part, { x: M, y: yy, size: 8, font });
    yy -= LINE_SMALL;
    if (yy < 56) return yy;
  }
  return yy - 1;
}

function drawPart1FormLikeRows(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  rows: { no: string; label: string; value: string }[],
  yStart: number
): number {
  let y = yStart;
  const x = M;
  const noW = 24;
  const labelW = 220;
  const valueW = PAGE_W - 2 * M - noW - labelW;
  const cellFontSize = 7.4;
  const lineH = 8.2;
  const wrapToWidth = (text: string, maxWidth: number): string[] => {
    if (!text) return [""];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, cellFontSize) <= maxWidth) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        if (font.widthOfTextAtSize(w, cellFontSize) <= maxWidth) {
          cur = w;
        } else {
          let chunk = "";
          for (const ch of w) {
            const t = chunk + ch;
            if (font.widthOfTextAtSize(t, cellFontSize) <= maxWidth) chunk = t;
            else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          cur = chunk;
        }
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };

  for (const r of rows) {
    const labelLines = wrapToWidth(r.label, labelW - 8);
    const valueLines = wrapToWidth(r.value || "—", valueW - 8);
    const lineCount = Math.max(1, labelLines.length, valueLines.length);
    const rowH = Math.max(14, lineCount * lineH + 4);
    if (y - rowH < 74) break;

    // Draw form-like boxes similar to input cells.
    page.drawRectangle({
      x,
      y: y - rowH,
      width: noW,
      height: rowH,
      borderColor: rgb(0.8, 0.84, 0.89),
      borderWidth: 0.6,
    });
    page.drawRectangle({
      x: x + noW,
      y: y - rowH,
      width: labelW,
      height: rowH,
      borderColor: rgb(0.8, 0.84, 0.89),
      borderWidth: 0.6,
    });
    page.drawRectangle({
      x: x + noW + labelW,
      y: y - rowH,
      width: valueW,
      height: rowH,
      borderColor: rgb(0.8, 0.84, 0.89),
      borderWidth: 0.6,
    });

    page.drawText(r.no, { x: x + 6, y: y - 10, size: cellFontSize, font: fontBold });
    const topTextY = y - 10;
    for (let i = 0; i < labelLines.length; i++) {
      page.drawText(labelLines[i], { x: x + noW + 4, y: topTextY - i * lineH, size: cellFontSize, font });
    }
    for (let i = 0; i < valueLines.length; i++) {
      page.drawText(valueLines[i], {
        x: x + noW + labelW + 4,
        y: topTextY - i * lineH,
        size: cellFontSize,
        font,
      });
    }

    y -= rowH;
  }

  return y;
}

function table2Col(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  rows: { label: string; a: string; b: string }[],
  yStart: number
): number {
  let y = yStart;
  page.drawText("Particulars", { x: M, y, size: 7, font: fontBold });
  page.drawText("A) Taxpayer/Filer", { x: 300, y, size: 7, font: fontBold });
  page.drawText("B) Spouse", { x: 455, y, size: 7, font: fontBold });
  y -= TABLE_LINE + 3;

  for (const r of rows) {
    const lab = r.label.length > 48 ? r.label.slice(0, 46) + "…" : r.label;
    page.drawText(lab, { x: M, y, size: 7, font });
    page.drawText(str(r.a) || "—", { x: 300, y, size: 7, font });
    page.drawText(str(r.b) || "—", { x: 455, y, size: 7, font });
    y -= TABLE_LINE;
    if (y < 70) break;
  }
  return y;
}

export type Generate1701aPdfOptions = {
  /** Item 11 on the PDF: always use the account login email, not the value typed on the evaluation form. */
  accountEmail?: string | null;
  /** Total portal submits for this evaluation (1 = first). When greater than 1, a resubmission banner prints on each page. */
  submit1701aCount?: number | null;
};

export async function generate1701aPdf(payload: AnyObj, options?: Generate1701aPdfOptions) {
  const emailItem11 = (() => {
    if (!options || !("accountEmail" in options)) return str(payload.email);
    const a = options.accountEmail;
    if (a != null && String(a).trim() !== "") return str(a);
    return "";
  })();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const period = [str(payload.forYearMonth), str(payload.forYearYear)].filter(Boolean).join(" / ") || str(payload.taxYear);

  // —— Page 1 ——
  const p1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  y = drawFormHeader(p1, font, fontBold, 1, y);
  y = drawResubmitNotice(p1, font, y, options?.submit1701aCount);

  p1.drawText("PART I — BACKGROUND INFORMATION ON TAXPAYER/FILER", { x: M, y, size: 9, font: fontBold });
  y -= LINE + 2;
  y = drawPart1FormLikeRows(
    p1,
    font,
    fontBold,
    [
      { no: "1", label: "For the Year (MM / YYYY)", value: period },
      { no: "2", label: "Amended Return?", value: yn(payload.amendedReturn) },
      { no: "3", label: "Short Period Return?", value: yn(payload.shortPeriodReturn) },
      { no: "4", label: "Taxpayer Identification Number (TIN)", value: tin(payload) },
      { no: "5", label: "RDO Code", value: str(payload.rdo) },
      { no: "6", label: "Taxpayer Type", value: taxpayerTypeLabel(payload.taxpayerType) },
      { no: "7", label: "Alphanumeric Tax Code (ATC)", value: atcLabel(payload.atc) },
      { no: "8", label: "Taxpayer's Name (Last Name, First Name, Middle Name)", value: derivedTaxpayerName(payload) },
      { no: "9", label: "Registered Address", value: str(payload.address) },
      { no: "9A", label: "Zip Code", value: str(payload.zip) },
      { no: "10", label: "Date of Birth (MM/DD/YYYY)", value: str(payload.dob) },
      { no: "11", label: "Email Address", value: emailItem11 },
      { no: "12", label: "Citizenship", value: str(payload.citizenship) },
      { no: "13", label: "Claiming Foreign Tax Credits?", value: yn(payload.foreignTaxCredits) },
      { no: "14", label: "Foreign Tax Number, if applicable", value: str(payload.foreignTaxNumber) },
      { no: "15", label: "Contact Number (Landline / Cellphone)", value: str(payload.contactNumber) },
      { no: "16", label: "Civil Status", value: civilLabel(payload.civilStatus) },
      { no: "17", label: "If married, spouse has income?", value: yn(payload.spouseHasIncome) },
      {
        no: "18",
        label: "Filing Status",
        value:
          str(payload.filingStatus) === "JOINT"
            ? "Joint Filing"
            : str(payload.filingStatus) === "SEPARATE"
              ? "Separate Filing"
              : str(payload.filingStatus) || "—",
      },
      { no: "19", label: "Tax Rate", value: taxRateLabel(payload.taxRateMethod) },
    ],
    y
  );

  y -= 10;
  p1.drawText("PART II — TOTAL TAX PAYABLE", { x: M, y, size: 9, font: fontBold });
  y -= LINE + 2;

  y = table2Col(p1, font, fontBold, [
    { label: "20  Tax Due", a: str(payload.taxDue20A), b: str(payload.taxDue20B) },
    { label: "21  Less: Total Tax Credits/Payments", a: str(payload.taxCredits21A), b: str(payload.taxCredits21B) },
    { label: "22  Tax Payable/(Overpayment)", a: str(payload.taxPayable22A), b: str(payload.taxPayable22B) },
    {
      label: "23  Less: Portion for 2nd Installment (if applicable)",
      a: str(payload.secondInstallment23A),
      b: str(payload.secondInstallment23B),
    },
    {
      label: "24  Amount Required to be Paid upon Filing/(Overpayment)",
      a: str(payload.amountToPay24A),
      b: str(payload.amountToPay24B),
    },
    { label: "25  Surcharge", a: str(payload.surcharge25A), b: str(payload.surcharge25B) },
    { label: "26  Interest", a: str(payload.interest26A), b: str(payload.interest26B) },
    { label: "27  Compromise", a: str(payload.compromise27A), b: str(payload.compromise27B) },
    { label: "28  Total Penalties", a: str(payload.totalPenalties28A), b: str(payload.totalPenalties28B) },
    {
      label: "29  Total Amount Payable/(Overpayment)",
      a: str(payload.totalAmountPayable29A),
      b: str(payload.totalAmountPayable29B),
    },
  ], y);

  y -= 8;
  y = rowPair(p1, font, "30  Aggregate Amount Payable/(Overpayment) (29A + 29B)", str(payload.aggregate30), y);

  y -= 4;
  y = rowPair(p1, font, "Overpayment option (if applicable)", overpayLabel(payload.overpaymentOption), y);

  p1.drawText("— End of Page 1 —", { x: M, y: 42, size: 8, font });
  p1.drawText("Generated for evaluation / admin review — not a BIR-filed return.", {
    x: M,
    y: 30,
    size: 7,
    font,
  });

  // —— Page 2 — Part IV (first half) or legacy summary ——
  const p2 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  y = PAGE_H - M;
  y = drawFormHeader(p2, font, fontBold, 2, y);
  y = drawResubmitNotice(p2, font, y, options?.submit1701aCount);

  if (hasPart4Object(payload)) {
    p2.drawText("PART IV — COMPUTATION OF INCOME TAX (AS FILED)", { x: M, y, size: 10, font: fontBold });
    y -= LINE + 4;
    y = drawParagraph(
      p2,
      font,
      "Items 36–65: columns A) Taxpayer/Filer and B) Spouse as submitted. Spouse column may be blank if not applicable.",
      8,
      y,
      LINE_SMALL
    );
    y -= 4;
    y = drawPart4Sections(p2, font, fontBold, payload, PART4_SECTIONS, y);

    y -= 6;
    if (y < 86) y = 86;
    p2.drawText("Declaration", { x: M, y, size: 9, font: fontBold });
    y -= LINE_SMALL + 2;
    const declOk = Boolean(payload.declarationAccepted);
    y = drawParagraph(
      p2,
      font,
      declOk
        ? "Taxpayer confirmed the portal declaration and that values match the filed Form 1701A."
        : "Declaration not marked as accepted on submission record.",
      8,
      y,
      LINE_SMALL
    );

    p2.drawText("— End of Page 2 —", { x: M, y: 42, size: 8, font });
    p2.drawText("Generated for evaluation / admin review — not a BIR-filed return.", {
      x: M,
      y: 30,
      size: 7,
      font,
    });
  } else {
    p2.drawText("COMPUTATION & SCHEDULES (AS FILED) — LEGACY SUMMARY", { x: M, y, size: 10, font: fontBold });
    y -= LINE + 6;
    y = drawParagraph(
      p2,
      font,
      "Older submission without Part IV grid; summary lines below.",
      9,
      y,
      LINE_SMALL
    );
    y -= 4;

    const compRows: [string, string][] = [
      ["Gross Sales / Receipts / Fees", str(payload.grossSales)],
      ["Less: Cost of Sales / Services", str(payload.costOfSales)],
      ["Gross Income", str(payload.grossIncome)],
      ["Less: Allowable Deductions", str(payload.deductions)],
      ["Taxable Income", str(payload.taxableIncome)],
      ["Income Tax Due", str(payload.incomeTaxDue)],
      ["Less: Tax Credits / Payments", str(payload.taxCredits)],
      ["Net Tax Payable / (Overpayment)", str(payload.netTaxPayable)],
    ];

    for (const [label, val] of compRows) {
      y = rowPair(p2, font, label, val, y);
      if (y < 200) break;
    }

    y -= 8;
    p2.drawText("Declaration", { x: M, y, size: 9, font: fontBold });
    y -= LINE_SMALL + 2;
    const declOk = Boolean(payload.declarationAccepted);
    y = drawParagraph(
      p2,
      font,
      declOk
        ? "Taxpayer confirmed the portal declaration and that values match the filed Form 1701A."
        : "Declaration not marked as accepted on submission record.",
      8,
      y,
      LINE_SMALL
    );

    p2.drawText("— End of Page 2 —", { x: M, y: 42, size: 8, font });
    p2.drawText("Generated for evaluation / admin review — not a BIR-filed return.", {
      x: M,
      y: 30,
      size: 7,
      font,
    });
  }

  return pdfDoc.save();
}
