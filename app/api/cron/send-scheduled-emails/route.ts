// app/api/cron/send-scheduled-emails/route.ts
import { NextResponse } from "next/server";
import { processScheduledEmailsBatch } from "@/lib/email/processScheduledEmails";

function isCronRequestAuthorized(req: Request): boolean {
  const configured = (process.env.CRON_KEY || process.env.CRON_SECRET || "").trim();
  if (!configured) return true;
  const headerKey = (req.headers.get("x-cron-key") || "").trim();
  if (headerKey && headerKey === configured) return true;
  const auth = (req.headers.get("authorization") || "").trim();
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1]?.trim() === configured);
}

export async function POST(req: Request) {
  if (!isCronRequestAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const stats = await processScheduledEmailsBatch();
  return NextResponse.json(stats);
}
