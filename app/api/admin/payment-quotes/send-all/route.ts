import { NextResponse } from "next/server";
import { isPaymentQuoteOperatorAuthed } from "@/lib/admin/paymentQuoteAccess";
import { getSubmitted1701aClientOptions } from "@/lib/admin/submittedClientOptions";
import {
  getSendAllQuotesJobState,
  kickSendAllQuotesJob,
  startSendAllQuotesJob,
} from "@/lib/admin/sendAllQuotesJob";
import { getBulkEmailSchedulerState } from "@/lib/admin/bulkEmailScheduler";

export async function GET() {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const job = await getSendAllQuotesJobState();
  if (job.status === "running") {
    kickSendAllQuotesJob(job.id);
  }
  return NextResponse.json({ ok: true, job });
}

export async function POST() {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scheduler = await getBulkEmailSchedulerState();
  if (scheduler.activeJobType === "reminders_send_all") {
    return NextResponse.json(
      {
        error: "busy_with_reminders",
        message: "Reminder email batch is currently running. Please retry after it finishes.",
      },
      { status: 409 }
    );
  }
  const before = await getSendAllQuotesJobState();
  const prevQueuedBatches = before.queuedBatches?.length ?? 0;
  const clients = await getSubmitted1701aClientOptions();
  const job = await startSendAllQuotesJob(clients.map((c) => c.email));
  kickSendAllQuotesJob(job.id);
  const stackAppend =
    before.status === "running" &&
    job.status === "running" &&
    before.id === job.id &&
    (job.queuedBatches?.length ?? 0) > prevQueuedBatches;
  return NextResponse.json({ ok: true, job, stackAppend });
}
