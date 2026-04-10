import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { syncReferralCreditsFromSubmittedEvaluations } from "@/lib/syncReferralCredits";

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const n = await syncReferralCreditsFromSubmittedEvaluations();
  const u = new URL("/admin/evaluations", req.url);
  u.searchParams.set("referralSync", String(n));
  return NextResponse.redirect(u, 303);
}
