import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { setProcessorIncomePricing } from "@/lib/processorIncomePricing";

function parsePhpField(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.floor(n);
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const quoteImageUploadPhp = parsePhpField(form.get("quoteImageUploadPhp"));
  const filingEmailPhp = parsePhpField(form.get("filingEmailPhp"));
  if (Number.isNaN(quoteImageUploadPhp) || Number.isNaN(filingEmailPhp)) {
    return NextResponse.redirect(new URL("/admin_dashboard/income-tracker?rateError=invalid", req.url), 303);
  }

  await setProcessorIncomePricing({ quoteImageUploadPhp, filingEmailPhp });
  return NextResponse.redirect(new URL("/admin_dashboard/income-tracker?rateSaved=1", req.url), 303);
}
