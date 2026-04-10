"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  taxYear: string;
  taxpayerName: string;
  tin: string;
  rdoCode: string;
  registeredAddress: string;
  email: string;
  contactNumber: string;

  grossSales: string;
  costOfSales: string;
  grossIncome: string;
  deductions: string;
  taxableIncome: string;
  incomeTaxDue: string;
  taxCredits: string;
  netTaxPayable: string;

  declarationAccepted: boolean;
};

export default function Evaluation1701APage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState<FormState>({
    taxYear: "",
    taxpayerName: "",
    tin: "",
    rdoCode: "",
    registeredAddress: "",
    email: "",
    contactNumber: "",

    grossSales: "",
    costOfSales: "",
    grossIncome: "",
    deductions: "",
    taxableIncome: "",
    incomeTaxDue: "",
    taxCredits: "",
    netTaxPayable: "",

    declarationAccepted: false
  });

  const completion = useMemo(() => {
    const required: (keyof FormState)[] = [
      "taxYear",
      "taxpayerName",
      "tin",
      "rdoCode",
      "registeredAddress",
      "email",
      "grossSales",
      "grossIncome",
      "taxableIncome",
      "incomeTaxDue",
      "netTaxPayable"
    ];
    const filled = required.filter((k) => String(f[k] ?? "").trim().length > 0).length;
    return Math.round((filled / required.length) * 100);
  }, [f]);

  async function onSubmit() {
    setErr(null);

    if (!f.declarationAccepted) {
      setErr("Please confirm that you entered values exactly as filed in your Form 1701A.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/evaluations/1701a/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f)
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Submit failed");
      }

      router.push("/account/evaluation/submitted");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400";

  const labelClass = "text-xs font-medium text-neutral-700";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-neutral-500">ACCOUNT</div>
            <h1 className="text-xl font-semibold text-neutral-900">Form 1701A Evaluation</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Please fill this out <span className="font-semibold">exactly as filed</span>. Any mismatch
              may delay evaluation.
            </p>
          </div>

          <div className="min-w-[180px] rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-semibold text-neutral-600">Completion</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-full rounded-full bg-neutral-200">
                <div className="h-2 rounded-full bg-neutral-900" style={{ width: `${completion}%` }} />
              </div>
              <div className="text-xs font-semibold text-neutral-700">{completion}%</div>
            </div>
            <div className="mt-2 text-[11px] text-neutral-600">
              Finish now to enter the queue (1–2 business days).
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">⚠ Important</div>
          <div className="mt-1 text-sm text-amber-900/90">
            Encode the numbers and details <span className="font-semibold">exactly as they appear</span>{" "}
            on your filed Form 1701A. Do not “estimate” or “recompute”.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className={labelClass}>Tax Year *</div>
            <input className={inputClass} value={f.taxYear} onChange={(e) => setF({ ...f, taxYear: e.target.value })} placeholder="e.g., 2025" />
          </div>
          <div>
            <div className={labelClass}>RDO Code *</div>
            <input className={inputClass} value={f.rdoCode} onChange={(e) => setF({ ...f, rdoCode: e.target.value })} placeholder="e.g., 039" />
          </div>

          <div className="md:col-span-2">
            <div className={labelClass}>Taxpayer Name *</div>
            <input className={inputClass} value={f.taxpayerName} onChange={(e) => setF({ ...f, taxpayerName: e.target.value })} placeholder="Complete name as filed" />
          </div>

          <div>
            <div className={labelClass}>TIN *</div>
            <input className={inputClass} value={f.tin} onChange={(e) => setF({ ...f, tin: e.target.value })} placeholder="000-000-000-000" />
          </div>
          <div>
            <div className={labelClass}>Contact Number</div>
            <input className={inputClass} value={f.contactNumber} onChange={(e) => setF({ ...f, contactNumber: e.target.value })} placeholder="09xx..." />
          </div>

          <div className="md:col-span-2">
            <div className={labelClass}>Registered Address *</div>
            <input className={inputClass} value={f.registeredAddress} onChange={(e) => setF({ ...f, registeredAddress: e.target.value })} placeholder="As registered / as filed" />
          </div>

          <div className="md:col-span-2">
            <div className={labelClass}>Email *</div>
            <input className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@email.com" />
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-semibold text-neutral-900">Tax Computation (as filed)</div>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className={labelClass}>Gross Sales/Receipts *</div>
              <input className={inputClass} value={f.grossSales} onChange={(e) => setF({ ...f, grossSales: e.target.value })} placeholder="e.g., 500000.00" />
            </div>
            <div>
              <div className={labelClass}>Cost of Sales/Services</div>
              <input className={inputClass} value={f.costOfSales} onChange={(e) => setF({ ...f, costOfSales: e.target.value })} placeholder="e.g., 0.00" />
            </div>

            <div>
              <div className={labelClass}>Gross Income *</div>
              <input className={inputClass} value={f.grossIncome} onChange={(e) => setF({ ...f, grossIncome: e.target.value })} placeholder="e.g., 500000.00" />
            </div>
            <div>
              <div className={labelClass}>Allowable Deductions</div>
              <input className={inputClass} value={f.deductions} onChange={(e) => setF({ ...f, deductions: e.target.value })} placeholder="e.g., 0.00" />
            </div>

            <div>
              <div className={labelClass}>Taxable Income *</div>
              <input className={inputClass} value={f.taxableIncome} onChange={(e) => setF({ ...f, taxableIncome: e.target.value })} placeholder="e.g., 250000.00" />
            </div>
            <div>
              <div className={labelClass}>Income Tax Due *</div>
              <input className={inputClass} value={f.incomeTaxDue} onChange={(e) => setF({ ...f, incomeTaxDue: e.target.value })} placeholder="e.g., 20000.00" />
            </div>

            <div>
              <div className={labelClass}>Tax Credits/Payments</div>
              <input className={inputClass} value={f.taxCredits} onChange={(e) => setF({ ...f, taxCredits: e.target.value })} placeholder="e.g., 0.00" />
            </div>
            <div>
              <div className={labelClass}>Net Tax Payable *</div>
              <input className={inputClass} value={f.netTaxPayable} onChange={(e) => setF({ ...f, netTaxPayable: e.target.value })} placeholder="e.g., 20000.00" />
            </div>
          </div>
        </div>

        <label className="mt-2 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <input
            type="checkbox"
            checked={f.declarationAccepted}
            onChange={(e) => setF({ ...f, declarationAccepted: e.target.checked })}
            className="mt-1 h-4 w-4"
          />
          <div>
            <div className="text-sm font-semibold text-neutral-900">Declaration</div>
            <div className="text-sm text-neutral-700">
              I confirm that I encoded the values <span className="font-semibold">exactly as filed</span>{" "}
              in my Form 1701A.
            </div>
          </div>
        </label>

        {err ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div> : null}

        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            After submission, evaluation typically completes in <span className="font-semibold">1–2 business days</span>.
          </div>

          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
