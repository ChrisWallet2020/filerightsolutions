// app/api/cron/send-scheduled-emails/route.ts
import { NextResponse } from "next/server";
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

    // Lightweight lock to reduce duplicate send in overlapping cron runs.
    const lock = await prisma.scheduledEmail.updateMany({
      where: {
        id: e.id,
        sentAt: null,
        failedAt: null,
      },
      data: { lastAttemptAt: new Date() },
    });
    if (lock.count === 0) continue;

    try {
      const shouldUseBillingFooter = e.type === "EVALUATION_NO_REDUCTION_UPDATE";
      const textBody = shouldUseBillingFooter ? `${e.body}\n\n${BILLING_EMAIL_FOOTER_TEXT}` : e.body;
      const htmlInner = shouldUseBillingFooter
        ? `${textToEmailHtmlParagraphs(e.body)}${billingEmailFooterHtml()}`
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

  return NextResponse.json({ processed: batch.length, sent, suppressed, failed, retried });
}
