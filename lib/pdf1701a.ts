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
const GRID = rgb(0.58, 0.64, 0.72);
const BAND = rgb(0.9, 0.92, 0.95);

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
  // Business rule: downloadable PDF must always show a fixed ATC display value.
  if (!str(v)) return "—";
  return 'II017 "II014 Income from Profession-Graduated IT Rates"';
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
  // Business rule: downloadable PDF must always show Item 19 as GRAD_OSD wording.
  if (!str(v)) return "—";
  return "Graduated Rates with OSD as method of deduction";
}

function yesNoInline(v: unknown): string {
  const s = str(v).toUpperCase();
  if (s === "YES") return "[X] Yes   [ ] No";
  if (s === "NO") return "[ ] Yes   [X] No";
  return "[ ] Yes   [ ] No";
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

function part4Num(p: AnyObj, no: number, side: "A" | "B"): number {
  const raw = part4Cell(p, no, side);
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, "").replace(/PHP\s*/gi, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function part4Money(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computedPart4Cell(p: AnyObj, no: number, side: "A" | "B"): string {
  // Business rule override for downloadable PDF (IV.A rows derived from IV.B inputs).
  const from47 = part4Num(p, 47, side);
  const from48 = part4Num(p, 48, side);
  const from49 = part4Num(p, 49, side);
  const from50 = part4Num(p, 50, side);
  const from51 = part4Num(p, 51, side);
  const osd40 = from49 * 0.4;
  const net60 = from49 * 0.6;
  const totalOther = from50 + from51;
  const totalTaxable = totalOther + net60;

  if (no === 36) return part4Money(from47);
  if (no === 37) return part4Money(from48);
  if (no === 38) return part4Money(from49);
  if (no === 39) return part4Money(osd40);
  if (no === 40) return part4Money(net60);
  if (no === 41) return part4Money(from50);
  if (no === 42) return part4Money(from51);
  if (no === 44) return part4Money(totalOther);
  if (no === 45) return part4Money(totalTaxable);
  if (no === 46) {
    if (totalTaxable < 250_000) return "0.00";
    // If >= 250,000, preserve submitted tax due value (no bracket recomputation here).
    const existing = part4Cell(p, 46, side);
    return existing || "0.00";
  }
  return part4Cell(p, no, side);
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
      const a = computedPart4Cell(payload, r.no, "A");
      const b = computedPart4Cell(payload, r.no, "B");
      const rawLabel = str(r.label);
      const lab = rawLabel.length > 54 ? rawLabel.slice(0, 52) + "…" : rawLabel;
      page.drawText(String(r.no), { x: noX, y, size: 7, font: fontBold });
      const labelFont = r.no === 46 || r.no === 56 || r.no === 65 ? fontBold : font;
      page.drawText(lab, { x: labelX, y, size: 7, font: labelFont });
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
  const outerW = PAGE_W - 2 * M;
  const outerH = 96;
  const leftW = 108;
  const rightW = 152;
  const midW = outerW - leftW - rightW;
  const top = y;
  const bottom = y - outerH;

  page.drawRectangle({ x: M, y: bottom, width: outerW, height: outerH, borderColor: GRID, borderWidth: 0.9 });
  page.drawLine({ start: { x: M + leftW, y: top }, end: { x: M + leftW, y: bottom }, color: GRID, thickness: 0.7 });
  page.drawLine({
    start: { x: M + leftW + midW, y: top },
    end: { x: M + leftW + midW, y: bottom },
    color: GRID,
    thickness: 0.7,
  });

  page.drawText("BIR Form No.", { x: M + 24, y: top - 16, size: 8.5, font });
  page.drawText("1701A", { x: M + 26, y: top - 38, size: 20, font: fontBold });
  page.drawText("January 2018 (ENCS)", { x: M + 16, y: top - 50, size: 7.5, font });
  page.drawText(`Page ${pageNum}`, { x: M + 38, y: top - 70, size: 8, font: fontBold });

  page.drawText("Annual Income Tax Return", { x: M + leftW + 92, y: top - 20, size: 15, font: fontBold });
  page.drawText("Individuals Earning Income PURELY from Business/Profession", {
    x: M + leftW + 22,
    y: top - 35,
    size: 8.5,
    font: fontBold,
  });
  page.drawText("[Graduated rates with OSD or 8% flat income tax rate]", {
    x: M + leftW + 68,
    y: top - 46,
    size: 7.8,
    font,
  });
  page.drawText("Values shown mirror the submitted portal evaluation fields.", {
    x: M + leftW + 54,
    y: top - 62,
    size: 7.8,
    font,
  });

  page.drawText("Client evaluation copy", { x: M + leftW + midW + 22, y: top - 18, size: 8.5, font: fontBold });
  page.drawText("Not a BIR-filed return", { x: M + leftW + midW + 26, y: top - 31, size: 7.6, font });
  page.drawRectangle({
    x: M + leftW + midW + 22,
    y: top - 78,
    width: rightW - 44,
    height: 34,
    borderColor: GRID,
    borderWidth: 0.6,
  });
  page.drawText("1701A", { x: M + leftW + midW + 57, y: top - 60, size: 10, font: fontBold });

  y -= outerH + 12;
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
      borderColor: GRID,
      borderWidth: 0.6,
    });
    page.drawRectangle({
      x: x + noW,
      y: y - rowH,
      width: labelW,
      height: rowH,
      borderColor: GRID,
      borderWidth: 0.6,
      color: rgb(0.96, 0.97, 0.98),
    });
    page.drawRectangle({
      x: x + noW + labelW,
      y: y - rowH,
      width: valueW,
      height: rowH,
      borderColor: GRID,
      borderWidth: 0.6,
    });

    page.drawText(r.no, { x: x + 6, y: y - 10, size: cellFontSize, font: fontBold });
    const topTextY = y - 10;
    for (let i = 0; i < labelLines.length; i++) {
      page.drawText(labelLines[i], { x: x + noW + 4, y: topTextY - i * lineH, size: cellFontSize, font: fontBold });
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

function drawSectionBand(page: PDFPage, fontBold: PDFFont, label: string, yStart: number): number {
  const h = 16;
  page.drawRectangle({
    x: M,
    y: yStart - h + 2,
    width: PAGE_W - 2 * M,
    height: h,
    color: BAND,
    borderColor: GRID,
    borderWidth: 0.8,
  });
  page.drawText(label, { x: M + 8, y: yStart - 10, size: 9, font: fontBold });
  // Keep a slightly larger gap under band text to avoid visual collision
  // with the first content row/paragraph that follows.
  return yStart - h - 8;
}

function drawTopQuestionRow(page: PDFPage, font: PDFFont, fontBold: PDFFont, payload: AnyObj, yStart: number): number {
  const h = 44;
  const w = PAGE_W - 2 * M;
  const colW = w / 3;
  const top = yStart;
  const bottom = yStart - h;

  page.drawRectangle({
    x: M,
    y: bottom,
    width: w,
    height: h,
    color: BAND,
    borderColor: GRID,
    borderWidth: 0.8,
  });
  page.drawLine({ start: { x: M + colW, y: top }, end: { x: M + colW, y: bottom }, color: GRID, thickness: 0.6 });
  page.drawLine({
    start: { x: M + colW * 2, y: top },
    end: { x: M + colW * 2, y: bottom },
    color: GRID,
    thickness: 0.6,
  });

  const periodMonth = str(payload.forYearMonth) || "MM";
  const periodYear = str(payload.forYearYear) || str(payload.taxYear) || "YYYY";
  const periodText = `${periodMonth} / ${periodYear}`;

  page.drawText("1 For the Year (MM / YYYY)", { x: M + 8, y: top - 14, size: 8.5, font: fontBold });
  page.drawRectangle({
    x: M + 8,
    y: top - 36,
    width: 94,
    height: 16,
    borderColor: rgb(0.55, 0.62, 0.72),
    borderWidth: 0.6,
    color: rgb(1, 1, 1),
  });
  page.drawText(periodText, { x: M + 14, y: top - 30, size: 8, font });

  page.drawText("2 Amended Return?", { x: M + colW + 8, y: top - 14, size: 8.5, font: fontBold });
  page.drawText(yesNoInline(payload.amendedReturn), { x: M + colW + 8, y: top - 30, size: 8, font });

  page.drawText("3 Short Period Return?", { x: M + colW * 2 + 8, y: top - 14, size: 8.5, font: fontBold });
  page.drawText(yesNoInline(payload.shortPeriodReturn), { x: M + colW * 2 + 8, y: top - 30, size: 8, font });

  return yStart - h - 12;
}

function drawLabeledInput(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  opts: { x: number; y: number; w: number; h?: number; label: string; value: string }
) {
  const h = opts.h ?? 18;
  page.drawText(opts.label, { x: opts.x, y: opts.y + h + 4, size: 8.2, font: fontBold });
  page.drawRectangle({
    x: opts.x,
    y: opts.y,
    width: opts.w,
    height: h,
    borderColor: GRID,
    borderWidth: 0.7,
    color: rgb(1, 1, 1),
  });
  page.drawText(opts.value || "", { x: opts.x + 6, y: opts.y + 6, size: 8.5, font });
}

function drawOptionRow(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  opts: { x: number; y: number; label: string; options: { text: string; selected: boolean }[] }
) {
  page.drawText(opts.label, { x: opts.x, y: opts.y, size: 8.2, font: fontBold });
  let xx = opts.x;
  for (const op of opts.options) {
    const token = op.selected ? "(x)" : "( )";
    const txt = `${token} ${op.text}`;
    page.drawText(txt, { x: xx, y: opts.y - 14, size: 8.4, font });
    xx += Math.max(95, font.widthOfTextAtSize(txt, 8.4) + 20);
  }
}

function drawPage1UiClone(page: PDFPage, font: PDFFont, fontBold: PDFFont, payload: AnyObj, yStart: number): number {
  let y = yStart;

  y = drawSectionBand(page, fontBold, "PART I - BACKGROUND INFORMATION ON TAXPAYER/FILER", y);
  const left = M;
  const rightCol = 385;
  const fullW = PAGE_W - 2 * M;

  // Row: 4/5/6
  page.drawText("4 Taxpayer Identification Number (TIN)", { x: left, y, size: 8.2, font: fontBold });
  const tinY = y - 20;
  const tinSegs = [str(payload.tin1), str(payload.tin2), str(payload.tin3), str(payload.tin4)];
  let tx = left;
  for (let i = 0; i < 4; i++) {
    drawLabeledInput(page, font, fontBold, { x: tx, y: tinY, w: i === 3 ? 44 : 48, h: 18, label: "", value: tinSegs[i] });
    tx += i === 3 ? 50 : 54;
    if (i < 3) page.drawText("-", { x: tx - 5, y: tinY + 6, size: 8.8, font });
  }
  drawLabeledInput(page, font, fontBold, { x: 190, y: tinY, w: 72, h: 18, label: "5 RDO Code", value: str(payload.rdo) });
  drawOptionRow(page, font, fontBold, {
    x: rightCol,
    y,
    label: "6 Taxpayer Type",
    options: [
      { text: "Single Proprietor", selected: String(payload.taxpayerType) === "SINGLE_PROP" },
      { text: "Professional", selected: String(payload.taxpayerType) === "PROFESSIONAL" },
    ],
  });
  y = tinY - 28;

  // Row: 7 ATC options (fixed two-column geometry for stable wrapping/alignment)
  const atcValue = atcLabel(payload.atc);
  page.drawText("7 Alphanumeric Tax Code (ATC)", { x: left, y: y + 12, size: 8.2, font: fontBold });
  const atcOptions = [
    "II012 Business Income-Graduated IT Rates",
    "II014 Income from Profession-Graduated IT Rates",
    "II015 Business Income-8% IT Rate",
    "II017 Income from Profession-8% IT Rate",
  ];
  const atcBoxX = left + 128;
  const atcBoxY = y - 12;
  const atcBoxW = fullW - 128;
  const atcBoxH = 34;
  const atcColW = Math.floor((atcBoxW - 12) / 2);
  const atcRowTopY = atcBoxY + atcBoxH - 11;
  const atcLineGap = 8.2;
  const wrapAtc = (text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, 7.7) <= maxWidth) {
        cur = next;
      } else {
        if (cur) out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out.slice(0, 2) : [""];
  };

  page.drawRectangle({
    x: atcBoxX,
    y: atcBoxY,
    width: atcBoxW,
    height: atcBoxH,
    borderColor: GRID,
    borderWidth: 0.6,
    color: rgb(1, 1, 1),
  });
  page.drawLine({
    start: { x: atcBoxX + atcColW + 6, y: atcBoxY + atcBoxH },
    end: { x: atcBoxX + atcColW + 6, y: atcBoxY },
    color: GRID,
    thickness: 0.5,
  });
  page.drawLine({
    start: { x: atcBoxX, y: atcBoxY + atcBoxH / 2 },
    end: { x: atcBoxX + atcBoxW, y: atcBoxY + atcBoxH / 2 },
    color: GRID,
    thickness: 0.5,
  });

  for (let i = 0; i < atcOptions.length; i++) {
    const selected = atcOptions[i] === atcValue || (i === 3 && atcValue.includes("II017"));
    const col = i < 2 ? 0 : 1;
    const row = i % 2;
    const cellX = atcBoxX + 6 + col * (atcColW + 6);
    const cellY = atcRowTopY - row * (atcBoxH / 2);
    const lines = wrapAtc(`${selected ? "(x)" : "( )"} ${atcOptions[i]}`, atcColW - 6);
    for (let li = 0; li < lines.length; li++) {
      page.drawText(lines[li], { x: cellX, y: cellY - li * atcLineGap, size: 7.7, font });
    }
  }
  y -= 36;

  drawLabeledInput(page, font, fontBold, {
    x: left,
    y: y - 14,
    w: fullW,
    label: "8 Taxpayer's Name (Last Name, First Name, Middle Name)",
    value: derivedTaxpayerName(payload),
  });
  y -= 38;

  drawLabeledInput(page, font, fontBold, { x: left, y: y - 14, w: 300, label: "9 Registered Address", value: str(payload.address) });
  drawLabeledInput(page, font, fontBold, { x: 310, y: y - 14, w: 90, label: "9A Zip Code", value: str(payload.zip) });
  y -= 38;

  drawLabeledInput(page, font, fontBold, { x: left, y: y - 14, w: 130, label: "10 Date of Birth (MM/DD/YYYY)", value: str(payload.dob) });
  drawLabeledInput(page, font, fontBold, { x: 285, y: y - 14, w: 280, label: "11 Email Address", value: str(payload.email) });
  y -= 38;

  drawLabeledInput(page, font, fontBold, { x: left, y: y - 14, w: 170, label: "12 Citizenship", value: str(payload.citizenship) });
  drawOptionRow(page, font, fontBold, {
    x: 190,
    y: y + 4,
    label: "13 Claiming Foreign Tax Credits?",
    options: [
      { text: "Yes", selected: String(payload.foreignTaxCredits) === "YES" },
      { text: "No", selected: String(payload.foreignTaxCredits) === "NO" },
    ],
  });
  drawLabeledInput(page, font, fontBold, { x: 385, y: y - 14, w: 180, label: "14 Foreign Tax Number, if applicable", value: str(payload.foreignTaxNumber) });
  y -= 38;

  drawLabeledInput(page, font, fontBold, {
    x: left,
    y: y - 14,
    w: fullW,
    label: "15 Contact Number (Landline / Cellphone)",
    value: str(payload.contactNumber),
  });
  y -= 40;

  // Row: 16/17/18 with fixed-width columns for exact horizontal alignment.
  const statusTopY = y + 2;
  const gap = 8;
  const c16w = 208;
  const c17w = 170;
  const c18w = fullW - c16w - c17w - gap * 2;
  const c16x = left;
  const c17x = c16x + c16w + gap;
  const c18x = c17x + c17w + gap;

  const drawFixedChoices = (
    x: number,
    colW: number,
    label: string,
    options: { text: string; selected: boolean }[],
    optionStep: number
  ) => {
    page.drawText(label, { x, y: statusTopY, size: 8.2, font: fontBold });
    let ox = x;
    const oy = statusTopY - 14;
    for (const op of options) {
      const txt = `${op.selected ? "(x)" : "( )"} ${op.text}`;
      page.drawText(txt, { x: ox, y: oy, size: 7.9, font });
      ox += optionStep;
      if (ox > x + colW - 30) break;
    }
  };

  drawFixedChoices(
    c16x,
    c16w,
    "16 Civil Status",
    [
      { text: "Single", selected: String(payload.civilStatus) === "SINGLE" },
      { text: "Married", selected: String(payload.civilStatus) === "MARRIED" },
      { text: "Legal Sep.", selected: String(payload.civilStatus) === "LEGAL_SEP" },
      { text: "Widow/er", selected: String(payload.civilStatus) === "WIDOW" },
    ],
    52
  );
  drawFixedChoices(
    c17x,
    c17w,
    "17 If married, spouse has income?",
    [
      { text: "Yes", selected: String(payload.spouseHasIncome) === "YES" },
      { text: "No", selected: String(payload.spouseHasIncome) === "NO" },
    ],
    58
  );
  drawFixedChoices(
    c18x,
    c18w,
    "18 Filing Status",
    [
      { text: "Joint", selected: String(payload.filingStatus) === "JOINT" },
      { text: "Separate", selected: String(payload.filingStatus) === "SEPARATE" },
    ],
    64
  );
  y -= 32;

  page.drawText("19 Tax Rate", { x: left, y: y + 10, size: 8.2, font: fontBold });
  const rateLabel = taxRateLabel(payload.taxRateMethod);
  page.drawText(`${rateLabel.includes("Graduated") ? "(x)" : "( )"} Graduated Rates with OSD as method of deduction`, {
    x: left + 6,
    y: y - 4,
    size: 8.2,
    font,
  });
  page.drawText(`${rateLabel.includes("8%") ? "(x)" : "( )"} 8% in lieu of Graduated Rates under Sec. 24(A) & Percentage Tax under Sec. 116 of the NIRC, as amended`, {
    x: left + 6,
    y: y - 16,
    size: 8.2,
    font,
  });
  y -= 30;

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
  const leftW = 252;
  const colW = 118;
  const rowH = 16;

  page.drawRectangle({ x: M, y: y - rowH + 2, width: leftW, height: rowH, color: rgb(0.97, 0.98, 0.99), borderColor: GRID, borderWidth: 0.6 });
  page.drawRectangle({ x: M + leftW, y: y - rowH + 2, width: colW, height: rowH, color: rgb(0.97, 0.98, 0.99), borderColor: GRID, borderWidth: 0.6 });
  page.drawRectangle({
    x: M + leftW + colW,
    y: y - rowH + 2,
    width: colW,
    height: rowH,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: GRID,
    borderWidth: 0.6,
  });
  page.drawText("Particulars", { x: M + 6, y: y - 10, size: 7.3, font: fontBold });
  page.drawText("A) Taxpayer/Filer", { x: M + leftW + 6, y: y - 10, size: 7.3, font: fontBold });
  page.drawText("B) Spouse", { x: M + leftW + colW + 6, y: y - 10, size: 7.3, font: fontBold });
  y -= rowH + 4;

  for (const r of rows) {
    const lab = r.label.length > 62 ? r.label.slice(0, 60) + "…" : r.label;
    page.drawRectangle({ x: M, y: y - rowH + 2, width: leftW, height: rowH, borderColor: GRID, borderWidth: 0.6 });
    page.drawRectangle({ x: M + leftW, y: y - rowH + 2, width: colW, height: rowH, borderColor: GRID, borderWidth: 0.6 });
    page.drawRectangle({ x: M + leftW + colW, y: y - rowH + 2, width: colW, height: rowH, borderColor: GRID, borderWidth: 0.6 });
    page.drawText(lab, { x: M + 6, y: y - 10, size: 7.1, font });
    page.drawText(str(r.a) || "0.00", { x: M + leftW + 6, y: y - 10, size: 7.1, font });
    page.drawText(str(r.b) || "0.00", { x: M + leftW + colW + 6, y: y - 10, size: 7.1, font });
    y -= rowH + 1;
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

  // —— Page 1 ——
  const p1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  y = drawFormHeader(p1, font, fontBold, 1, y);
  y = drawResubmitNotice(p1, font, y, options?.submit1701aCount);
  y = drawTopQuestionRow(p1, font, fontBold, payload, y);
  const page1Payload = { ...payload, email: emailItem11 };
  y = drawPage1UiClone(p1, font, fontBold, page1Payload, y);

  y -= 8;
  y = drawSectionBand(p1, fontBold, "PART II — TOTAL TAX PAYABLE", y);

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

  y -= 10;
  y = rowPair(p1, font, "30  Aggregate Amount Payable/(Overpayment) (29A + 29B)", str(payload.aggregate30), y);

  y -= 6;
  y = rowPair(p1, font, "Overpayment option (if applicable) — mark one", overpayLabel(payload.overpaymentOption), y);

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
    y = drawSectionBand(p2, fontBold, "PART IV — COMPUTATION OF INCOME TAX (AS FILED)", y);
    y = drawParagraph(
      p2,
      font,
      "Items 36–65: columns A) Taxpayer/Filer and B) Spouse as submitted. Spouse column may be blank if not applicable.",
      8,
      y,
      LINE_SMALL
    );
    y -= 2;
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
    y = drawSectionBand(p2, fontBold, "COMPUTATION & SCHEDULES (AS FILED) — LEGACY SUMMARY", y);
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
