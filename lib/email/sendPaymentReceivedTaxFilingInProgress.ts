import { prisma } from "@/lib/db";
import { EMAIL_TYPE } from "@/lib/constants";
import {
  buildPaymentReceivedTaxFilingInProgressEmail,
  paymentReceivedTaxFilingInProgressSubject,
} from "@/lib/email/paymentReceivedInProgressEmail";
import { sendMail } from "@/lib/email/mailer";

/**
 * Ensures `EmailLog` row exists, sends the “tax filing in progress” email once, then marks the log sent.
 * Safe to call from webhooks on every paid event: skips if already `sentAt`.
 */
export async function sendPaymentReceivedTaxFilingInProgressForOrder(order: {
  id: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
}): Promise<void> {
  const to = order.customerEmail.trim();
  if (!to) return;

  const subject = paymentReceivedTaxFilingInProgressSubject();

  const log = await prisma.emailLog.upsert({
    where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.PAYMENT_RECEIVED } },
    update: { toEmail: to, subject },
    create: {
      orderId: order.id,
      type: EMAIL_TYPE.PAYMENT_RECEIVED,
      toEmail: to,
      subject,
    },
  });

  if (log.sentAt) return;

  const { subject: subj, textBody, htmlBody } = buildPaymentReceivedTaxFilingInProgressEmail(
    order.customerName,
    order.orderId
  );

  try {
    const r = await sendMail(to, subj, textBody, htmlBody);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { sentAt: new Date(), providerMessageId: r.messageId ?? null },
    });
  } catch (e) {
    console.error("PAYMENT_RECEIVED_IN_PROGRESS_SEND_FAILED", order.id, e);
  }
}
