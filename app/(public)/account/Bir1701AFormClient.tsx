// app/(public)/account/Bir1701AFormClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { PART4_SECTIONS, defaultPart4, mergePart4FromSaved } from "@/lib/bir1701aPart4";

type Props = {
  evaluationId: string;
  existingPayloadJson: string | null;
  evaluationStatus?: string;
  onPayloadSaved?: (payloadJson: string) => void;
};

type YesNo = "YES" | "NO" | "";

type FormState = {
  /** Item 1 — month (MM) */
  forYearMonth: string;
  /** Item 1 — year (YYYY) */
  forYearYear: string;
  amendedReturn: YesNo;
  shortPeriodReturn: YesNo;

  tin1: string;
  tin2: string;
  tin3: string;
  tin4: string;
  rdo: string;

  taxpayerType: "PROFESSIONAL" | "SINGLE_PROP" | "";
  atc: "II014" | "II012" | "II015" | "II017" | "";

  taxpayerName: string;

  address: string;
  zip: string;

  dob: string;
  email: string;
  citizenship: string;

  foreignTaxCredits: YesNo;
  foreignTaxNumber: string;

  contactNumber: string;

  civilStatus: "SINGLE" | "MARRIED" | "LEGAL_SEP" | "WIDOW" | "";

  spouseHasIncome: YesNo;

  filingStatus: "JOINT" | "SEPARATE" | "";

  taxRateMethod: "GRAD_OSD" | "EIGHT_PERCENT" | "";

  /** Kept for backward compatibility with older saves / PDF helpers */
  taxYear: string;

  grossSales: string;
  costOfSales: string;
  grossIncome: string;
  deductions: string;
  taxableIncome: string;
  incomeTaxDue: string;
  taxCredits: string;
  netTaxPayable: string;

  declarationAccepted: boolean;

  taxDue20A: string;
  taxDue20B: string;
  taxCredits21A: string;
  taxCredits21B: string;
  taxPayable22A: string;
  taxPayable22B: string;
  secondInstallment23A: string;
  secondInstallment23B: string;
  amountToPay24A: string;
  amountToPay24B: string;
  surcharge25A: string;
  surcharge25B: string;
  interest26A: string;
  interest26B: string;
  compromise27A: string;
  compromise27B: string;
  totalPenalties28A: string;
  totalPenalties28B: string;
  totalAmountPayable29A: string;
  totalAmountPayable29B: string;
  aggregate30: string;

  overpaymentOption: "REFUND" | "TCC" | "CARRY_OVER" | "";

  /** Part IV — dual columns per BIR 1701A (items 36–65). */
  part4: Record<string, string>;
};

const Z = "0.00";

const MONTH_OPTIONS: { v: string; label: string }[] = [
  { v: "", label: "MM" },
  { v: "01", label: "01" },
  { v: "02", label: "02" },
  { v: "03", label: "03" },
  { v: "04", label: "04" },
  { v: "05", label: "05" },
  { v: "06", label: "06" },
  { v: "07", label: "07" },
  { v: "08", label: "08" },
  { v: "09", label: "09" },
  { v: "10", label: "10" },
  { v: "11", label: "11" },
  { v: "12", label: "12" },
];

const BIR_DECLARATION =
  "I confirm that the information I have provided is true and accurate to the best of my knowledge. I understand that this will be used to review and assist with my tax filing in accordance with applicable Philippine tax regulations. I also consent to the processing of my information in line with the Data Privacy Act of 2012.";

/** Read body once — mixing `json()` then `text()` leaves the stream empty and hides real errors. */
async function readFetchBody(res: Response): Promise<{
  text: string;
  json: Record<string, unknown> | null;
}> {
  const text = await res.text();
  if (!text.trim()) return { text: "", json: null };
  try {
    const v = JSON.parse(text) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return { text, json: v as Record<string, unknown> };
    }
  } catch {
    /* plain-text error body */
  }
  return { text, json: null };
}

const emptyForm: FormState = {
  forYearMonth: "",
  forYearYear: "",
  amendedReturn: "",
  shortPeriodReturn: "",

  tin1: "",
  tin2: "",
  tin3: "",
  tin4: "",
  rdo: "",

  taxpayerType: "",
  atc: "",

  taxpayerName: "",

  address: "",
  zip: "",

  dob: "",
  email: "",
  citizenship: "FILIPINO",

  foreignTaxCredits: "",
  foreignTaxNumber: "",

  contactNumber: "",

  civilStatus: "",

  spouseHasIncome: "",

  filingStatus: "",

  taxRateMethod: "",

  taxYear: "",

  grossSales: Z,
  costOfSales: Z,
  grossIncome: Z,
  deductions: Z,
  taxableIncome: Z,
  incomeTaxDue: Z,
  taxCredits: Z,
  netTaxPayable: Z,

  declarationAccepted: false,

  taxDue20A: Z,
  taxDue20B: Z,
  taxCredits21A: Z,
  taxCredits21B: Z,
  taxPayable22A: Z,
  taxPayable22B: Z,
  secondInstallment23A: Z,
  secondInstallment23B: Z,
  amountToPay24A: Z,
  amountToPay24B: Z,
  surcharge25A: Z,
  surcharge25B: Z,
  interest26A: Z,
  interest26B: Z,
  compromise27A: Z,
  compromise27B: Z,
  totalPenalties28A: Z,
  totalPenalties28B: Z,
  totalAmountPayable29A: Z,
  totalAmountPayable29B: Z,
  aggregate30: Z,

  overpaymentOption: "",

  part4: defaultPart4(),
};

/** Part I items 1–19 except 14, 17, 18 (optional for “Next”) must be filled before Page 2. */
function validatePartOneForNextPage(d: FormState): string | null {
  const missing: string[] = [];
  const add = (label: string) => missing.push(label);

  if (!d.forYearMonth.trim()) add("1 - Month (MM)");
  if (!d.forYearYear.trim()) add("1 - Year (YYYY)");
  if (d.amendedReturn !== "YES" && d.amendedReturn !== "NO") add("2 - Amended Return?");
  if (d.shortPeriodReturn !== "YES" && d.shortPeriodReturn !== "NO") add("3 - Short Period Return?");

  const tinOk = [d.tin1, d.tin2, d.tin3, d.tin4].every((x) => String(x ?? "").trim() !== "");
  if (!tinOk) add("4 - TIN (all parts)");

  if (!d.rdo.trim()) add("5 - RDO Code");
  if (d.taxpayerType !== "PROFESSIONAL" && d.taxpayerType !== "SINGLE_PROP") add("6 - Taxpayer Type");
  if (!d.atc) add("7 - Alphanumeric Tax Code (ATC)");
  if (!d.taxpayerName.trim()) add("8 - Taxpayer's Name");
  if (!d.address.trim()) add("9 - Registered Address");
  if (!d.zip.trim()) add("9A - Zip Code");
  if (!d.dob.trim()) add("10 - Date of Birth");
  if (!d.email.trim()) add("11 - Email Address");
  if (!d.citizenship.trim()) add("12 - Citizenship");
  if (d.foreignTaxCredits !== "YES" && d.foreignTaxCredits !== "NO") add("13 - Foreign Tax Credits");
  // 14 - Foreign Tax Number: optional (not validated)
  if (!d.contactNumber.trim()) add("15 - Contact Number");
  if (!d.civilStatus) add("16 - Civil Status");
  // 17–18: optional for advancing to Page 2 (still available when married)
  if (d.taxRateMethod !== "GRAD_OSD" && d.taxRateMethod !== "EIGHT_PERCENT") add("19 - Tax Rate");

  if (missing.length === 0) return null;
  if (missing.length === 1) return `Please fill up ${missing[0]}.`;
  const list = missing.slice(0, 8).join("; ");
  const more = missing.length > 8 ? `; and ${missing.length - 8} more` : "";
  return `Please fill up: ${list}${more}.`;
}

function normalizeInitial(
  parsed: Record<string, unknown> | null
): FormState {
  if (!parsed) return { ...emptyForm };
  const out: FormState = { ...emptyForm, ...(parsed as FormState) };

  if (!String(out.taxpayerName || "").trim()) {
    const ln = String(parsed.lastName ?? "").trim();
    const fn = String(parsed.firstName ?? "").trim();
    const mn = String(parsed.middleName ?? "").trim();
    const parts = [ln, fn, mn].filter(Boolean);
    if (parts.length) out.taxpayerName = parts.join(", ");
  }

  if (!String(out.forYearYear || "").trim() && String(out.taxYear || "").trim()) {
    out.forYearYear = String(out.taxYear).trim();
  }
  if (!String(out.taxYear || "").trim() && String(out.forYearYear || "").trim()) {
    out.taxYear = String(out.forYearYear).trim();
  }

  out.part4 = mergePart4FromSaved(parsed);

  return out;
}

export default function Bir1701AFormClient({
  evaluationId,
  existingPayloadJson,
  evaluationStatus,
  onPayloadSaved,
}: Props) {
  const router = useRouter();

  const initial = useMemo(() => {
    if (!existingPayloadJson) return emptyForm;
    try {
      const parsed = JSON.parse(existingPayloadJson);
      if (parsed && typeof parsed === "object") {
        return normalizeInitial(parsed as Record<string, unknown>);
      }
    } catch {
      /* ignore */
    }
    return emptyForm;
  }, [existingPayloadJson]);

  const [data, setData] = useState<FormState>(initial);
  const [formPage, setFormPage] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const latestDataRef = useRef<FormState>(initial);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);
  const busy = isSaving || isSubmitting;
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((p) => {
      const next = { ...p, [key]: value };
      if (key === "forYearYear") {
        next.taxYear = String(value).trim();
      }
      if (key === "taxYear") {
        next.forYearYear = String(value).trim();
      }
      return next;
    });
  }

  function setPart4(key: string, value: string) {
    setData((p) => ({
      ...p,
      part4: { ...p.part4, [key]: value },
    }));
  }

  async function onSave() {
    setIsSaving(true);
    setErr(null);

    try {
      const res = await fetch("/api/evaluations/1701a/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId, payload: latestDataRef.current }),
      });

      const { text, json } = await readFetchBody(res);
      if (!res.ok) {
        const msg =
          (typeof json?.error === "string" && json.error) ||
          text.trim() ||
          "Save failed";
        throw new Error(msg);
      }

      onPayloadSaved?.(JSON.stringify(latestDataRef.current));
      alert("Saved.");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  function requestSubmit() {
    setErr(null);
    if (!data.declarationAccepted) {
      setErr("Please confirm the declaration before submitting.");
      return;
    }
    setSubmitConfirmOpen(true);
  }

  async function performSubmit() {
    setSubmitConfirmOpen(false);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/evaluations/1701a/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId, payload: latestDataRef.current }),
      });

      const { text, json: out } = await readFetchBody(res);

      if (out && typeof out.redirect === "string") {
        router.push(out.redirect);
        return;
      }

      if (!res.ok) {
        let msg =
          (typeof out?.error === "string" && out.error) ||
          text.trim() ||
          "Submit failed";
        if (typeof out?.detail === "string" && out.detail.trim()) {
          msg = `${msg} (${out.detail.trim()})`;
        }
        throw new Error(msg);
      }

      const redirect =
        typeof out?.redirect === "string" ? out.redirect : "/evaluation-submitted";
      router.push(redirect);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {submitConfirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirm-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => {
            if (!isSubmitting) setSubmitConfirmOpen(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 380,
              width: "100%",
              padding: "22px 20px 20px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.28)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="submit-confirm-title"
              style={{
                margin: "0 0 10px",
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              Submit Evaluation
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: 12,
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              Please confirm that all details are correct before submitting.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setSubmitConfirmOpen(false)}
                style={{ ...btnSecondary, opacity: isSubmitting ? 0.6 : 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void performSubmit()}
                style={{ ...btnPrimary, opacity: isSubmitting ? 0.85 : 1 }}
              >
                {isSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formPage === 1 ? (
        <div style={formSheet}>
          <Bir1701AFormHeader page={1} />

          <div style={topBarRow}>
            <Field label="1  For the Year (MM / YYYY)">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={data.forYearMonth}
                  onChange={(e) => set("forYearMonth", e.target.value)}
                  style={selectStyle}
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.v || "empty"} value={m.v}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span style={{ color: "#64748b" }}>/</span>
                <BoxInput
                  value={data.forYearYear}
                  onChange={(v) => set("forYearYear", v)}
                  width={88}
                  placeholder="YYYY"
                />
              </div>
            </Field>
            <Field label="2  Amended Return?">
              <div style={{ display: "flex", gap: 10 }}>
                <RadioRow
                  checked={data.amendedReturn === "YES"}
                  label="Yes"
                  onClick={() => set("amendedReturn", "YES")}
                />
                <RadioRow
                  checked={data.amendedReturn === "NO"}
                  label="No"
                  onClick={() => set("amendedReturn", "NO")}
                />
              </div>
            </Field>
            <Field label="3  Short Period Return?">
              <div style={{ display: "flex", gap: 10 }}>
                <RadioRow
                  checked={data.shortPeriodReturn === "YES"}
                  label="Yes"
                  onClick={() => set("shortPeriodReturn", "YES")}
                />
                <RadioRow
                  checked={data.shortPeriodReturn === "NO"}
                  label="No"
                  onClick={() => set("shortPeriodReturn", "NO")}
                />
              </div>
            </Field>
          </div>

          <div style={formHeader}>
            PART I - BACKGROUND INFORMATION ON TAXPAYER/FILER
          </div>

          <div style={row}>
            <Field label="4  Taxpayer Identification Number (TIN)">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <BoxInput
                  value={data.tin1}
                  onChange={(v) => set("tin1", v)}
                  width={64}
                />
                <span>-</span>
                <BoxInput
                  value={data.tin2}
                  onChange={(v) => set("tin2", v)}
                  width={64}
                />
                <span>-</span>
                <BoxInput
                  value={data.tin3}
                  onChange={(v) => set("tin3", v)}
                  width={64}
                />
                <span>-</span>
                <BoxInput
                  value={data.tin4}
                  onChange={(v) => set("tin4", v)}
                  width={64}
                />
              </div>
            </Field>

            <Field label="5  RDO Code">
              <BoxInput
                value={data.rdo}
                onChange={(v) => set("rdo", v)}
                width={90}
              />
            </Field>

            <Field label="6  Taxpayer Type">
              <div style={{ display: "grid", gap: 6 }}>
                <RadioRow
                  checked={data.taxpayerType === "SINGLE_PROP"}
                  label="Single Proprietor"
                  onClick={() => set("taxpayerType", "SINGLE_PROP")}
                />
                <RadioRow
                  checked={data.taxpayerType === "PROFESSIONAL"}
                  label="Professional"
                  onClick={() => set("taxpayerType", "PROFESSIONAL")}
                />
              </div>
            </Field>
          </div>

          <div style={partBand7}>
            <div style={atc7BulletRow}>
              <div style={atc7FieldLabel}>
                {"7  Alphanumeric Tax Code (ATC)"}
              </div>
              <div style={atc7Grid}>
                <RadioRow
                  checked={data.atc === "II012"}
                  label="II012 Business Income-Graduated IT Rates"
                  noWrap
                  onClick={() => set("atc", "II012")}
                />
                <RadioRow
                  checked={data.atc === "II014"}
                  label="II014 Income from Profession-Graduated IT Rates"
                  noWrap
                  onClick={() => set("atc", "II014")}
                />
                <RadioRow
                  checked={data.atc === "II015"}
                  label="II015 Business Income-8% IT Rate"
                  noWrap
                  onClick={() => set("atc", "II015")}
                />
                <RadioRow
                  checked={data.atc === "II017"}
                  label="II017 Income from Profession-8% IT Rate"
                  noWrap
                  onClick={() => set("atc", "II017")}
                />
              </div>
            </div>
          </div>

          <div style={partBand8}>
            <div style={partBand8FieldLabel}>
              {"8  Taxpayer's Name "}
              <span style={labelItalicHint}>
                (Last Name, First Name, Middle Name)
              </span>
            </div>
            <BoxInput
              value={data.taxpayerName}
              onChange={(v) => set("taxpayerName", v)}
            />
          </div>

          <div style={row}>
            <Field label="9  Registered Address">
              <BoxInput
                value={data.address}
                onChange={(v) => set("address", v)}
                placeholder="No./Street, Barangay, City/Municipality, Province"
              />
            </Field>
            <Field label="9A  Zip Code">
              <BoxInput
                value={data.zip}
                onChange={(v) => set("zip", v)}
                width={120}
              />
            </Field>
          </div>

          <div style={row}>
            <Field label="10  Date of Birth (MM/DD/YYYY)">
              <BoxInput
                value={data.dob}
                onChange={(v) => set("dob", v)}
                width={180}
                placeholder="MM/DD/YYYY"
              />
            </Field>
            <Field label="11  Email Address">
              <BoxInput
                value={data.email}
                onChange={(v) => set("email", v)}
                placeholder=""
                type="text"
                inputMode="email"
                autoComplete="off"
                name={`bir1701a-email-${evaluationId}`}
              />
            </Field>
          </div>

          <div style={row}>
            <Field label="12  Citizenship">
              <BoxInput
                value={data.citizenship}
                onChange={(v) => set("citizenship", v)}
              />
            </Field>

            <Field label="13  Claiming Foreign Tax Credits?">
              <div style={{ display: "flex", gap: 10 }}>
                <RadioRow
                  checked={data.foreignTaxCredits === "YES"}
                  label="Yes"
                  onClick={() => set("foreignTaxCredits", "YES")}
                />
                <RadioRow
                  checked={data.foreignTaxCredits === "NO"}
                  label="No"
                  onClick={() => set("foreignTaxCredits", "NO")}
                />
              </div>
            </Field>

            <Field label="14  Foreign Tax Number, if applicable">
              <BoxInput
                value={data.foreignTaxNumber}
                onChange={(v) => set("foreignTaxNumber", v)}
              />
            </Field>
          </div>

          <div style={row}>
            <Field label="15  Contact Number (Landline / Cellphone)">
              <BoxInput
                value={data.contactNumber}
                onChange={(v) => set("contactNumber", v)}
              />
            </Field>
          </div>

          <div style={row}>
            <Field label="16  Civil Status">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <RadioRow
                  checked={data.civilStatus === "SINGLE"}
                  label="Single"
                  onClick={() => set("civilStatus", "SINGLE")}
                />
                <RadioRow
                  checked={data.civilStatus === "MARRIED"}
                  label="Married"
                  onClick={() => set("civilStatus", "MARRIED")}
                />
                <RadioRow
                  checked={data.civilStatus === "LEGAL_SEP"}
                  label="Legally Separated"
                  onClick={() => set("civilStatus", "LEGAL_SEP")}
                />
                <RadioRow
                  checked={data.civilStatus === "WIDOW"}
                  label="Widow/er"
                  onClick={() => set("civilStatus", "WIDOW")}
                />
              </div>
            </Field>

            <Field label="17  If married, spouse has income?">
              <div style={{ display: "flex", gap: 10 }}>
                <RadioRow
                  checked={data.spouseHasIncome === "YES"}
                  label="Yes"
                  onClick={() => set("spouseHasIncome", "YES")}
                />
                <RadioRow
                  checked={data.spouseHasIncome === "NO"}
                  label="No"
                  onClick={() => set("spouseHasIncome", "NO")}
                />
              </div>
            </Field>

            <Field label="18  Filing Status">
              <div style={{ display: "flex", gap: 10 }}>
                <RadioRow
                  checked={data.filingStatus === "JOINT"}
                  label="Joint Filing"
                  onClick={() => set("filingStatus", "JOINT")}
                />
                <RadioRow
                  checked={data.filingStatus === "SEPARATE"}
                  label="Separate Filing"
                  onClick={() => set("filingStatus", "SEPARATE")}
                />
              </div>
            </Field>
          </div>

          <div style={row}>
            <Field label="19  Tax Rate">
              <div style={{ display: "grid", gap: 6 }}>
                <RadioRow
                  checked={data.taxRateMethod === "GRAD_OSD"}
                  label="Graduated Rates with OSD as method of deduction"
                  onClick={() => set("taxRateMethod", "GRAD_OSD")}
                />
                <RadioRow
                  checked={data.taxRateMethod === "EIGHT_PERCENT"}
                  label="8% in lieu of Graduated Rates under Sec. 24(A) & Percentage Tax under Sec. 116 of the NIRC, as amended"
                  onClick={() => set("taxRateMethod", "EIGHT_PERCENT")}
                />
              </div>
            </Field>
          </div>

          <div style={{ ...formHeader, marginTop: 12 }}>
            PART II - TOTAL TAX PAYABLE
          </div>

          <div style={part4TableWrap}>
            <div style={dualHeaderRow}>
              <div style={dualLabelCol}>Particulars</div>
              <div style={dualMoneyCol}>A) Taxpayer/Filer</div>
              <div style={dualMoneyCol}>B) Spouse</div>
            </div>
            <Part2DualRow
              label="20  Tax Due"
              a={data.taxDue20A}
              b={data.taxDue20B}
              setA={(v) => set("taxDue20A", v)}
              setB={(v) => set("taxDue20B", v)}
            />
            <Part2DualRow
              label="21  Less: Total Tax Credits/Payments"
              a={data.taxCredits21A}
              b={data.taxCredits21B}
              setA={(v) => set("taxCredits21A", v)}
              setB={(v) => set("taxCredits21B", v)}
            />
            <Part2DualRow
              label="22  Tax Payable/(Overpayment)"
              a={data.taxPayable22A}
              b={data.taxPayable22B}
              setA={(v) => set("taxPayable22A", v)}
              setB={(v) => set("taxPayable22B", v)}
            />
            <Part2DualRow
              label="23  Less: Portion of Tax Payable Allowed for 2nd Installment (if applicable)"
              a={data.secondInstallment23A}
              b={data.secondInstallment23B}
              setA={(v) => set("secondInstallment23A", v)}
              setB={(v) => set("secondInstallment23B", v)}
            />
            <Part2DualRow
              label="24  Amount of Tax Required to be Paid upon Filing/(Overpayment)"
              a={data.amountToPay24A}
              b={data.amountToPay24B}
              setA={(v) => set("amountToPay24A", v)}
              setB={(v) => set("amountToPay24B", v)}
            />
            <div style={{ ...p2Row, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
              Add: Penalties
            </div>
            <Part2DualRow
              label="25  Surcharge"
              a={data.surcharge25A}
              b={data.surcharge25B}
              setA={(v) => set("surcharge25A", v)}
              setB={(v) => set("surcharge25B", v)}
            />
            <Part2DualRow
              label="26  Interest"
              a={data.interest26A}
              b={data.interest26B}
              setA={(v) => set("interest26A", v)}
              setB={(v) => set("interest26B", v)}
            />
            <Part2DualRow
              label="27  Compromise"
              a={data.compromise27A}
              b={data.compromise27B}
              setA={(v) => set("compromise27A", v)}
              setB={(v) => set("compromise27B", v)}
            />
            <Part2DualRow
              label="28  Total Penalties"
              a={data.totalPenalties28A}
              b={data.totalPenalties28B}
              setA={(v) => set("totalPenalties28A", v)}
              setB={(v) => set("totalPenalties28B", v)}
            />
            <Part2DualRow
              label="29  Total Amount Payable/(Overpayment)"
              a={data.totalAmountPayable29A}
              b={data.totalAmountPayable29B}
              setA={(v) => set("totalAmountPayable29A", v)}
              setB={(v) => set("totalAmountPayable29B", v)}
            />
            <div style={aggregate30Row}>
              <div style={{ fontSize: 13, color: "#0f172a", flex: 1 }}>
                30  Aggregate Amount Payable/(Overpayment) (Items 29A + 29B)
              </div>
              <MoneyInput
                value={data.aggregate30}
                onChange={(v) => set("aggregate30", v)}
                width={160}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
              If overpayment, mark one box only (once chosen, choice is
              irrevocable):
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <RadioRow
                checked={data.overpaymentOption === "REFUND"}
                label="To be refunded"
                onClick={() => set("overpaymentOption", "REFUND")}
              />
              <RadioRow
                checked={data.overpaymentOption === "TCC"}
                label="To be issued a Tax Credit Certificate (TCC)"
                onClick={() => set("overpaymentOption", "TCC")}
              />
              <RadioRow
                checked={data.overpaymentOption === "CARRY_OVER"}
                label="To be carried over as a tax credit for next year/quarter"
                onClick={() => set("overpaymentOption", "CARRY_OVER")}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={formSheet}>
          <Bir1701AFormHeader page={2} />

          <div style={{ ...formHeader, marginTop: 0 }}>
            PART IV — COMPUTATION OF INCOME TAX (AS FILED)
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
            Enter amounts exactly as on your filed BIR Form 1701A Part IV, columns{" "}
            <b>A) Taxpayer/Filer</b> and <b>B) Spouse</b>. Use <b>0.00</b> if a line does not
            apply. Totals on Part II (Items 20–30) should agree with Part IV where applicable.
          </div>

          <div style={part4DualHeaderRow}>
            <div style={part4DualHeaderLabel}>Particulars (Item no.)</div>
            <div style={part4DualHeaderMoney}>A) Taxpayer/Filer</div>
            <div style={part4DualHeaderMoney}>B) Spouse</div>
          </div>

          {PART4_SECTIONS.map((sec) => (
            <div key={sec.id} style={{ marginBottom: 14 }}>
              <div style={part4SectionBar}>{sec.subtitle}</div>
              {sec.rows.map((row) => (
                <Part2DualRow
                  key={row.no}
                  label={`${row.no}  ${row.label}`}
                  labelBold={row.no === 46 || row.no === 56 || row.no === 65}
                  a={data.part4[`${row.no}A`] ?? Z}
                  b={data.part4[`${row.no}B`] ?? Z}
                  setA={(v) => setPart4(`${row.no}A`, v)}
                  setB={(v) => setPart4(`${row.no}B`, v)}
                />
              ))}
            </div>
          ))}

          <div style={{ ...declarationBox, marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              Declaration
            </div>
            <p
              style={{
                fontSize: 12,
                color: "#334155",
                fontWeight: 400,
                lineHeight: 1.4,
                margin: "0 0 20px",
              }}
            >
              {BIR_DECLARATION}
            </p>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={data.declarationAccepted}
                onChange={(e) => set("declarationAccepted", e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16 }}
              />
              <span style={{ fontSize: 12, color: "#0f172a" }}>
                I confirm the above declaration and that the values I entered
                match my filed Form 1701A.
              </span>
            </label>
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {err ? (
          <div role="alert" style={formErrBanner}>
            {err}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {formPage === 1 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const msg = validatePartOneForNextPage(data);
                  if (msg) {
                    setErr(msg);
                    return;
                  }
                  setErr(null);
                  setFormPage(2);
                }}
                disabled={busy}
                style={btnPrimary}
              >
                Next Page
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={busy}
                style={btnSecondary}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setFormPage(1)}
                disabled={busy}
                style={btnSecondary}
              >
                Back
              </button>
              <button
                type="button"
                onClick={requestSubmit}
                disabled={busy}
                style={btnPrimary}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={busy}
                style={btnSecondary}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
        Tip: Use <b>Save</b> anytime. On Page 2, review your amounts, confirm the{" "}
        <b>Declaration</b>, then <b>Submit</b>.
      </div>
    </div>
  );
}

function Bir1701AFormHeader({ page }: { page: 1 | 2 }) {
  return (
    <div style={birHeaderOuter}>
      <div style={birHeaderLeft}>
        <div style={birHdrSmall}>BIR Form No.</div>
        <div style={birHdrFormNumber}>1701A</div>
        <div style={birHdrSmall}>January 2018 (ENCS)</div>
        <div style={birHdrPageLine}>Page {page}</div>
      </div>
      <div style={birHeaderMiddle}>
        <div style={birHdrMainTitle}>Annual Income Tax Return</div>
        <div style={birHdrMidBold}>
          Individuals Earning Income PURELY from Business/Profession
        </div>
        <div style={birHdrMidBold}>
          [Those under the graduated income tax rates with OSD as mode of
          deductions
        </div>
        <div style={birHdrMidBold}>
          OR those who opted to avail of the 8% flat income tax rate]
        </div>
        <div style={birHdrInstruction}>
          Enter all required information in CAPITAL LETTERS using BLACK ink. Mark
          all applicable
        </div>
        <div style={birHdrInstruction}>
          boxes with an &quot;X&quot;. Two copies MUST be filed with the BIR and
          one held by the Tax Filer.
        </div>
      </div>
      <div style={birHeaderRight}>
        <img
          src="/form/bir-1701a-barcode-p1.png"
          alt={`BIR Form 1701A barcode — 1701A 01/18 P${page}`}
          style={{
            width: "100%",
            maxWidth: 168,
            height: "auto",
            display: "block",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={labelStyle}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function RadioRow({
  checked,
  label,
  onClick,
  labelSize = 13,
  noWrap = false,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  labelSize?: number;
  /** Single-line label (e.g. BIR item 7 ATC grid) */
  noWrap?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          border: "1px solid #1e40af",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#1e40af",
              display: "block",
            }}
          />
        ) : null}
      </span>
      <span
        style={{
          fontSize: labelSize,
          color: "#0f172a",
          lineHeight: noWrap ? 1.2 : 1.35,
          whiteSpace: noWrap ? "nowrap" : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function BoxInput({
  value,
  onChange,
  width,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  width?: number;
  placeholder?: string;
  type?: "text" | "email";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  name?: string;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={{
        border: "1px solid #94a3b8",
        borderRadius: 2,
        padding: "6px 8px",
        width: width ? width : "100%",
        fontSize: 13,
        background: "white",
      }}
    />
  );
}

function formatMoneyWithCommas(input: string) {
  const raw = String(input ?? "");
  if (!raw) return "";

  let s = raw.replace(/,/g, "").replace(/\s+/g, "");
  s = s.replace(/[^0-9.]/g, "");

  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    const before = s.slice(0, firstDot + 1);
    const after = s
      .slice(firstDot + 1)
      .replace(/\./g, "")
      .slice(0, 2);
    s = before + after;
  }

  const parts = s.split(".");
  let intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts[1] : undefined;

  if (!intPart && firstDot === 0) {
    return decPart !== undefined ? `0.${decPart}` : "0.";
  }

  intPart = intPart.replace(/^0+(?=\d)/, "");

  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decPart !== undefined) return `${withCommas}.${decPart}`;
  return withCommas;
}

function MoneyInput({
  value,
  onChange,
  width,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  width?: number;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      inputMode="decimal"
      onChange={(e) => onChange(formatMoneyWithCommas(e.target.value))}
      placeholder={placeholder}
      style={{
        border: "1px solid #94a3b8",
        borderRadius: 2,
        padding: "6px 8px",
        width: width ? width : "100%",
        fontSize: 13,
        background: "white",
        textAlign: "right",
      }}
    />
  );
}

function Part2DualRow({
  label,
  labelBold,
  a,
  b,
  setA,
  setB,
}: {
  label: string;
  labelBold?: boolean;
  a: string;
  b: string;
  setA: (v: string) => void;
  setB: (v: string) => void;
}) {
  return (
    <div style={dualDataRow}>
      <div style={dualLabelCol}>
        <span style={{ fontSize: 13, color: "#0f172a", fontWeight: labelBold ? 700 : 400 }}>{label}</span>
      </div>
      <div style={dualMoneyCol}>
        <MoneyInput value={a} onChange={setA} width={124} />
      </div>
      <div style={dualMoneyCol}>
        <MoneyInput value={b} onChange={setB} width={124} />
      </div>
    </div>
  );
}

const formSheet: React.CSSProperties = {
  border: "1px solid #94a3b8",
  background: "#f3f4f6",
  padding: 12,
  borderRadius: 6,
};

const birHeaderOuter: React.CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "stretch",
  border: "1px solid #9ca3af",
  background: "#ffffff",
  marginBottom: 14,
  overflowX: "auto",
  fontFamily: 'Arial, Helvetica, "Segoe UI", system-ui, sans-serif',
  color: "#0f172a",
};

const birHeaderLeft: React.CSSProperties = {
  flex: "0 0 118px",
  borderRight: "1px solid #9ca3af",
  padding: "10px 8px 12px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: 4,
};

const birHdrSmall: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 400,
  lineHeight: 1.25,
};

const birHdrFormNumber: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
};

const birHdrPageLine: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  marginTop: 6,
};

const birHeaderMiddle: React.CSSProperties = {
  flex: "1 1 55%",
  minWidth: 0,
  padding: "8px 14px 10px",
  textAlign: "center",
  borderRight: "1px solid #9ca3af",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
};

const birHdrMainTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1.08,
  marginBottom: 0,
  textAlign: "center",
  width: "100%",
};

const birHdrMidBold: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.2,
  marginBottom: 0,
  textAlign: "center",
  width: "100%",
  maxWidth: 420,
};

const birHdrInstruction: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 400,
  lineHeight: 1.22,
  marginTop: 0,
  marginBottom: 0,
  textAlign: "center",
  width: "100%",
  maxWidth: 440,
};

const birHeaderRight: React.CSSProperties = {
  flex: "0 0 156px",
  padding: "10px 10px 12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 8,
};

const topBarRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: 14,
  padding: 10,
  background: "#e5e7eb",
  border: "1px solid #94a3b8",
  borderRadius: 4,
};

const formHeader: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  background: "#e5e7eb",
  border: "1px solid #94a3b8",
  padding: "6px 10px",
  marginBottom: 10,
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 6,
};

/** Inline with Field labels / tip copy (12px); radius matches formSheet */
const formErrBanner: React.CSSProperties = {
  marginBottom: 12,
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
  fontSize: 12,
  lineHeight: 1.45,
};

const part4TableWrap: React.CSSProperties = {
  border: "1px solid #94a3b8",
  background: "white",
  padding: 10,
  borderRadius: 4,
};

const dualHeaderRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  borderBottom: "2px solid #94a3b8",
  paddingBottom: 8,
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 800,
  color: "#475569",
};

const part4DualHeaderRow: React.CSSProperties = {
  ...dualHeaderRow,
  background: "#f8fafc",
  padding: "8px 10px",
  borderRadius: 4,
  border: "1px solid #94a3b8",
  marginBottom: 10,
};

const part4DualHeaderLabel: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 11,
  fontWeight: 800,
};

const part4DualHeaderMoney: React.CSSProperties = {
  width: 132,
  flexShrink: 0,
  textAlign: "right" as const,
  fontSize: 11,
  fontWeight: 800,
};

const part4SectionBar: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#0f172a",
  background: "#e2e8f0",
  border: "1px solid #94a3b8",
  padding: "6px 10px",
  marginBottom: 8,
  borderRadius: 4,
};

const dualDataRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  borderBottom: "1px dashed #e2e8f0",
  paddingBottom: 6,
  marginBottom: 4,
};

const dualLabelCol: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
};

const dualMoneyCol: React.CSSProperties = {
  width: 132,
  flexShrink: 0,
  textAlign: "right",
};

const aggregate30Row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 8,
  paddingTop: 10,
  borderTop: "2px solid #94a3b8",
};

const declarationBox: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #94a3b8",
  background: "white",
};

const p2Row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  borderBottom: "1px dashed #e2e8f0",
  paddingBottom: 6,
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #94a3b8",
  borderRadius: 2,
  padding: "6px 8px",
  fontSize: 13,
  background: "white",
  minWidth: 72,
};

/** Items 7–8: same spacing rhythm as `row`; no shaded band */
const partBand7: React.CSSProperties = {
  marginBottom: 10,
  overflow: "visible",
};

const partBand8: React.CSSProperties = {
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

/** Item 7: label left, 2×2 ATC grid right — no scrollbars; grid wraps below label if needed */
const atc7BulletRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  gap: 16,
  rowGap: 10,
  width: "100%",
  overflow: "visible",
};

/** Same typography as Field labels (e.g. item 4); sits flush left with other Part I rows */
const atc7FieldLabel: React.CSSProperties = {
  ...labelStyle,
  marginBottom: 0,
  whiteSpace: "nowrap",
  flexShrink: 0,
  alignSelf: "flex-start",
  paddingTop: 2,
};

/** Item 8 — same left edge & typography as Field labels (e.g. item 4) */
const partBand8FieldLabel: React.CSSProperties = {
  ...labelStyle,
  marginBottom: 0,
  whiteSpace: "nowrap",
  overflowX: "auto",
  width: "100%",
  minWidth: 0,
};

const labelItalicHint: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  fontStyle: "italic",
  color: "#0f172a",
};

/** Item 7 — 2×2 ATC: columns sized to longest line each; radios stay on one row per option */
const atc7Grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "max-content max-content",
  columnGap: 32,
  rowGap: 10,
  flex: "0 0 auto",
  alignItems: "center",
  justifyItems: "start",
};

const btnPrimary: React.CSSProperties = {
  background: "#1e40af",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "white",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};
