import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  enqueueBulkEmailJob,
  getBulkEmailSchedulerState,
  setBulkEmailSchedulerActive,
  tryStartNextBulkEmailJob,
} from "@/lib/admin/bulkEmailScheduler";
import {
  getReminderSendAllJobState,
  kickReminderSendAllJob,
  queueReminderSendAllJob,
  startReminderSendAllJob,
} from "@/lib/admin/sendAllReminderEmailsJob";

export async function POST() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scheduler = await getBulkEmailSchedulerState();
  const currentReminder = await getReminderSendAllJobState();
  if (currentReminder.status === "queued" || currentReminder.status === "running") {
    return NextResponse.json({
      ok: true,
      queued: currentReminder.status === "queued",
      started: currentReminder.status === "running",
      job: currentReminder,
      scheduler,
    });
  }

  if (scheduler.activeJobType && scheduler.activeJobType !== "reminders_send_all") {
    const queuedJob = await queueReminderSendAllJob();
    await enqueueBulkEmailJob("reminders_send_all");
    const queuedScheduler = await tryStartNextBulkEmailJob();
    return NextResponse.json({
      ok: true,
      queued: true,
      started: false,
      job: queuedJob,
      scheduler: queuedScheduler,
    });
  }

  const startedJob = await startReminderSendAllJob();
  await setBulkEmailSchedulerActive("reminders_send_all");
  kickReminderSendAllJob(startedJob.id);
  return NextResponse.json({
    ok: true,
    queued: false,
    started: true,
    job: startedJob,
    scheduler: await getBulkEmailSchedulerState(),
  });
}
