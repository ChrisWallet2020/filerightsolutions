import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getBulkEmailSchedulerState } from "@/lib/admin/bulkEmailScheduler";
import { getReminderSendAllJobState } from "@/lib/admin/sendAllReminderEmailsJob";

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [job, scheduler] = await Promise.all([getReminderSendAllJobState(), getBulkEmailSchedulerState()]);
  return NextResponse.json({ ok: true, job, scheduler });
}
