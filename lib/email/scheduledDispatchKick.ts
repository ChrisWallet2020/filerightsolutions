import { processScheduledEmailsBatch } from "@/lib/email/processScheduledEmails";

let inFlight: Promise<void> | null = null;

export function kickScheduledEmailDispatch(reason = "unknown"): void {
  if (inFlight) return;
  inFlight = (async () => {
    try {
      await processScheduledEmailsBatch();
    } catch (err) {
      console.error("SCHEDULED_EMAIL_SELF_KICK_FAILED", { reason, err });
    } finally {
      inFlight = null;
    }
  })();
}
