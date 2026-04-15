import { NextResponse } from "next/server";
import { processAgentReferralPipeline } from "@/lib/agentReferralsSync";

export async function POST(req: Request) {
  const key = req.headers.get("x-cron-key");
  if (process.env.CRON_KEY && key !== process.env.CRON_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const out = await processAgentReferralPipeline();
  return NextResponse.json({ ok: true, ...out });
}
