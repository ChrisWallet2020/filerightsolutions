import { prisma } from "@/lib/db";
import { EMAIL_TYPE, ORDER_STATUS } from "@/lib/constants";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";
import { QUOTED_BILLING_CODE } from "@/lib/quotedBillingPackage";
import { buildFilingCompleteNotifyEmail, firstNameFromFullName } from "@/lib/email/filingCompleteNotifyEmail";
import { sendMail } from "@/lib/email/mailer";

/**
 * Sends the standard filing confirmation email once, when a quoted-billing order becomes paid.
 * Idempotent via `EmailLog` (orderId + FILING_COMPLETE_NOTIFY).
 */
export async function sendFilingCompleteNotifyIfQuotedOrderPaid(orderDbId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderDbId },
    include: { pkg: { select: { code: true } } },
  });
  if (!order || order.status !== ORDER_STATUS.PAID || order.pkg?.code !== QUOTED_BILLING_CODE) {
    return;
  }

  const existing = await prisma.emailLog.findUnique({
    where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.FILING_COMPLETE_NOTIFY } },
  });
  if (existing?.sentAt) return;

  const user = await findUserWith1701aSubmissionByEmail(order.customerEmail);
  if (!user) {
    console.warn("FILING_COMPLETE_NOTIFY_SKIPPED_NO_EVAL_USER", order.orderId, order.customerEmail);
    return;
  }

  const firstName = firstNameFromFullName(user.fullName);
  const { subject, textBody, htmlBody } = buildFilingCompleteNotifyEmail(firstName);

  try {
    const r = await sendMail(user.email, subject, textBody, htmlBody);
    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.FILING_COMPLETE_NOTIFY } },
      update: {
        toEmail: user.email,
        subject,
        sentAt: new Date(),
        failedAt: null,
        failReason: null,
        providerMessageId: r.messageId,
      },
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.FILING_COMPLETE_NOTIFY,
        toEmail: user.email,
        subject,
        sentAt: new Date(),
        providerMessageId: r.messageId,
      },
    });
  } catch (e) {
    console.error("FILING_COMPLETE_NOTIFY_SEND_FAILED", order.orderId, e);
    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.FILING_COMPLETE_NOTIFY } },
      update: {
        toEmail: user.email,
        subject,
        failedAt: new Date(),
        failReason: String((e as Error)?.message || e),
      },
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.FILING_COMPLETE_NOTIFY,
        toEmail: user.email,
        subject,
        failedAt: new Date(),
        failReason: String((e as Error)?.message || e),
      },
    });
  }
}
