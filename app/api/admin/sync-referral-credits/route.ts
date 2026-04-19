import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed, isProcessor1Authed, isProcessor2Authed } from "@/lib/auth";
import { getProcessor1Credentials, getProcessor2Credentials } from "@/lib/siteSettings";
import { syncReferralCreditsFromSubmittedEvaluations } from "@/lib/syncReferralCredits";

export async function POST(req: NextRequest) {
  const [processor1, processor2] = await Promise.all([getProcessor1Credentials(), getProcessor2Credentials()]);
  if (
    !isAdminAuthed() &&
    !isProcessor1Authed(processor1.username) &&
    !isProcessor2Authed(processor2.username)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const n = await syncReferralCreditsFromSubmittedEvaluations();
  const referer = req.headers.get("referer") || "";
  let dest = "/admin/evaluations";
  if (referer.includes("/processor1_dashboard")) dest = "/processor1_dashboard/evaluations";
  else if (referer.includes("/processor2_dashboard")) dest = "/processor2_dashboard/evaluations";

  const u = new URL(dest, req.url);
  u.searchParams.set("referralSync", String(n));
  return NextResponse.redirect(u, 303);
}
