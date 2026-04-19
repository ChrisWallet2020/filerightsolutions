import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { setSalesFeesLimits } from "@/lib/siteSettings";

function parseOptionalAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const minSalesFees = String(form.get("minSalesFees") ?? "").trim();
  const maxSalesFees = String(form.get("maxSalesFees") ?? "").trim();

  const minValue = parseOptionalAmount(minSalesFees);
  const maxValue = parseOptionalAmount(maxSalesFees);
  if (minSalesFees && minValue === null) {
    return new NextResponse("Invalid minimum amount.", { status: 400 });
  }
  if (maxSalesFees && maxValue === null) {
    return new NextResponse("Invalid maximum amount.", { status: 400 });
  }
  if (minValue !== null && maxValue !== null && minValue > maxValue) {
    return new NextResponse("Minimum cannot be greater than maximum.", { status: 400 });
  }

  await setSalesFeesLimits(minSalesFees || null, maxSalesFees || null);

  return NextResponse.redirect(new URL("/admin_dashboard/evaluation-limits", req.url), 303);
}
