import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import {
  BILLING_EMAIL_FOOTER_TEXT,
  billingEmailFooterHtml,
  textToEmailHtmlParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";
import {
  addSuppression,
  isSuppressedEmail,
  maxScheduledAttempts,
  maxScheduledBatchSize,
  retryDelayMinutesForAttempt,
} from "@/lib/email/policy";
import {
  DISPATCH_HEARTBEAT_KEY,
  DISPATCH_LAST_STATS_KEY,
  setSiteSettingJson,
  setSiteSettingString,
} from "@/lib/email/scheduledEmailHealth";

const CLIENT_TEMPLATE_SCHEDULED_TYPES = new Set<string>([
  "REGISTER_WELCOME",
  "PASSWORD_RESET",
  "FILING_COMPLETE_NOTIFY",
  "EVALUATION_PAYMENT_FOLLOWUP",
  "EVALUATION_NO_REDUCTION_UPDATE",
  "BIR_1701A_DEADLINE_REMINDER",
  "ADMIN_CUSTOM_CLIENT_EMAIL",
]);

function splitStandardFooter(body: string): { mainBody: string; hasStandardFooter: boolean } {
  const normalized = body.replace(/\r\n/g, "\n").trimEnd();
  const footer = BILLING_EMAIL_FOOTER_TEXT.replace(/\r\n/g, "\n").trim();
  if (!normalized.endsWith(footer)) {
    return { mainBody: normalized, hasStandardFooter: false };
  }
  const main = normalized.slice(0, normalized.length - footer.length).replace(/\n+$/g, "");
  return { mainBody: main, hasStandardFooter: true };
}

export type ScheduledEmailRunStats = {
  processed: number;
  sent: number;
  suppressed: number;
  failed: number;
  retried: number;
};

export async function processScheduledEmailsBatch(): Promise<ScheduledEmailRunStats> {
  const now = new Date();
  const maxAttempts = maxScheduledAttempts();
  const take = maxScheduledBatchSize();

  const batch = await prisma.scheduledEmail.findMany({
    where: {
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      sendAt: { lte: now },
      sentAt: null,
      failedAt: null,
      attemptCount: { lt: maxAttempts },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { sendAt: "asc" }, { createdAt: "asc" }],
    take,
  });

  let sent = 0;
  let suppressed = 0;
  let failed = 0;
  let retried = 0;

  for (const e of batch) {
    if (await isSuppressedEmail(e.toEmail)) {
      suppressed += 1;
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: {
          failedAt: new Date(),
          failReason: "recipient_suppressed",
          lastAttemptAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
      continue;
    }

    // Lightweight row lock for overlapping runners.
    const lock = await prisma.scheduledEmail.updateMany({
      where: { id: e.id, sentAt: null, failedAt: null },
      data: { lastAttemptAt: new Date() },
    });
    if (lock.count === 0) continue;

    try {
      const { mainBody, hasStandardFooter } = splitStandardFooter(e.body);
      const shouldUseBillingFooter = CLIENT_TEMPLATE_SCHEDULED_TYPES.has(e.type) || hasStandardFooter;
      const textBody = shouldUseBillingFooter && !hasStandardFooter ? `${e.body}\n\n${BILLING_EMAIL_FOOTER_TEXT}` : e.body;
      const htmlInner = shouldUseBillingFooter
        ? `${textToEmailHtmlParagraphs(mainBody)}${billingEmailFooterHtml()}`
        : textToEmailHtmlParagraphs(e.body);
      const htmlBody = wrapEmailMainHtml(htmlInner, clientEmailBranding());
      const idempotencyKey = e.idempotencyKey || `scheduled:${e.id}`;

      const result = await sendMail(e.toEmail, e.subject, textBody, htmlBody);
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: {
          sentAt: new Date(),
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          nextAttemptAt: null,
          idempotencyKey,
          lastProviderMessageId: result.messageId,
        },
      });
      sent += 1;
    } catch (err: any) {
      const attemptNum = e.attemptCount + 1;
      const shouldGiveUp = attemptNum >= maxAttempts;
      const failReason = String(err?.message || "Send failed");
      if (/invalid recipient|recipient is suppressed|mailbox unavailable|550|5\.1\.1/i.test(failReason)) {
        await addSuppression(e.toEmail, failReason, "scheduled-send");
      }
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: shouldGiveUp
          ? {
              failedAt: new Date(),
              failReason,
              attemptCount: attemptNum,
              lastAttemptAt: new Date(),
            }
          : {
              failReason,
              attemptCount: attemptNum,
              lastAttemptAt: new Date(),
              nextAttemptAt: new Date(now.getTime() + retryDelayMinutesForAttempt(attemptNum) * 60_000),
            },
      });
      failed += shouldGiveUp ? 1 : 0;
      retried += shouldGiveUp ? 0 : 1;
    }
  }

  const stats = { processed: batch.length, sent, suppressed, failed, retried };
  try {
    await Promise.all([
      setSiteSettingString(DISPATCH_HEARTBEAT_KEY, new Date().toISOString()),
      setSiteSettingJson(DISPATCH_LAST_STATS_KEY, stats),
    ]);
  } catch (e) {
    console.error("SCHEDULED_DISPATCH_HEARTBEAT_WRITE_FAILED", e);
  }
  return stats;
}
