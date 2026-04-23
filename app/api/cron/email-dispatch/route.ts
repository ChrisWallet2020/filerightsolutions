import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EMAIL_TYPE, ORDER_STATUS } from "@/lib/constants";
import { sendMail } from "@/lib/email/mailer";
import { uploadRequestEmail, completionEmail } from "@/lib/email/templates";
import { buildPaymentReceivedTaxFilingInProgressEmail } from "@/lib/email/paymentReceivedInProgressEmail";
import { EMAIL_DELAYS } from "@/lib/email/timing";
import { config } from "@/lib/config";
import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import {
  joinTextParagraphs,
  textToEmailHtmlParagraphs,
  wrapEmailMainHtml,
  emailSignatureText,
} from "@/lib/email/formatting";
import { processAgentReferralPipeline } from "@/lib/agentReferralsSync";

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export async function POST(req: Request) {
  // Optional simple shared secret for cron calls
  const key = req.headers.get("x-cron-key");
  if (process.env.CRON_KEY && key !== process.env.CRON_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pending = await prisma.emailLog.findMany({
    where: { sentAt: null, failedAt: null },
    include: { order: { include: { pkg: true, uploads: true } } },
    take: 50
  });

  let sent = 0;
  let skipped = 0;

  for (const e of pending) {
    const order = e.order;

    // Timing rules:
    // PAYMENT_RECEIVED: send only if PAID and not yet sent
    // UPLOAD_REMINDER_1: send if PAID, no uploads, paidAt <= now-24h
    // UPLOAD_REMINDER_2: send if PAID, no uploads, paidAt <= now-72h
    // DOCUMENTS_RECEIVED: send when first upload happened (we queue it on upload)
    // COMPLETION: send only if DONE

    const uploadLink = `${config.baseUrl}/upload/${order.uploadToken}`;

    try {
      if (e.type === EMAIL_TYPE.PAYMENT_RECEIVED) {
        if (order.status !== ORDER_STATUS.PAID || !order.paidAt) { skipped++; continue; }
        const tpl = await buildPaymentReceivedTaxFilingInProgressEmail(order.customerName, order.orderId);
        const r = await sendMail(e.toEmail, tpl.subject, tpl.textBody, tpl.htmlBody);
        await prisma.emailLog.update({ where: { id: e.id }, data: { sentAt: new Date(), providerMessageId: r.messageId } });
        sent++;
        continue;
      }

      if (e.type === EMAIL_TYPE.UPLOAD_REMINDER_1) {
        if (order.status !== ORDER_STATUS.PAID || !order.paidAt) { skipped++; continue; }
        if (order.uploads.length > 0) { skipped++; continue; }
        if (order.paidAt > hoursAgo(EMAIL_DELAYS.uploadReminder1Hours)) { skipped++; continue; }

        const tpl = uploadRequestEmail({
          clientName: order.customerName,
          orderId: order.orderId,
          serviceName: order.pkg.name,
          amountPhp: order.amountPhp,
          uploadLink
        });
        const html = wrapEmailMainHtml(textToEmailHtmlParagraphs(tpl.body), clientEmailBranding());
        const r = await sendMail(e.toEmail, tpl.subject, tpl.body, html);
        await prisma.emailLog.update({ where: { id: e.id }, data: { sentAt: new Date(), providerMessageId: r.messageId } });
        sent++;
        continue;
      }

      if (e.type === EMAIL_TYPE.UPLOAD_REMINDER_2) {
        if (order.status !== ORDER_STATUS.PAID || !order.paidAt) { skipped++; continue; }
        if (order.uploads.length > 0) { skipped++; continue; }
        if (order.paidAt > hoursAgo(EMAIL_DELAYS.uploadReminder2Hours)) { skipped++; continue; }

        const tpl = uploadRequestEmail({
          clientName: order.customerName,
          orderId: order.orderId,
          serviceName: order.pkg.name,
          amountPhp: order.amountPhp,
          uploadLink
        });
        const html = wrapEmailMainHtml(textToEmailHtmlParagraphs(tpl.body), clientEmailBranding());
        const r = await sendMail(e.toEmail, tpl.subject, tpl.body, html);
        await prisma.emailLog.update({ where: { id: e.id }, data: { sentAt: new Date(), providerMessageId: r.messageId } });
        sent++;
        continue;
      }

      if (e.type === EMAIL_TYPE.DOCUMENTS_RECEIVED) {
        const subject = `Documents Received – Order ${order.orderId}`;
        const body = joinTextParagraphs([
          `Hello ${order.customerName},`,
          `We have received your uploaded documents for Order ${order.orderId}.`,
          `We will begin our review and computation based on the documents provided. If additional information is needed, we will contact you by email.`,
          `${emailSignatureText("Reiner")}\n${config.siteName}\n${config.supportEmail}`,
        ]);
        const html = wrapEmailMainHtml(textToEmailHtmlParagraphs(body), clientEmailBranding());
        const r = await sendMail(e.toEmail, subject, body, html);
        await prisma.emailLog.update({ where: { id: e.id }, data: { sentAt: new Date(), providerMessageId: r.messageId } });
        sent++;
        continue;
      }

      if (e.type === EMAIL_TYPE.COMPLETION) {
        if (order.status !== ORDER_STATUS.DONE) { skipped++; continue; }
        const tpl = completionEmail({
          clientName: order.customerName,
          orderId: order.orderId,
          serviceName: order.pkg.name,
          amountPhp: order.amountPhp,
          uploadLink
        });
        const html = wrapEmailMainHtml(textToEmailHtmlParagraphs(tpl.body), clientEmailBranding());
        const r = await sendMail(e.toEmail, tpl.subject, tpl.body, html);
        await prisma.emailLog.update({ where: { id: e.id }, data: { sentAt: new Date(), providerMessageId: r.messageId } });
        sent++;
        continue;
      }

      // Unhandled types in MVP
      skipped++;
    } catch (err: any) {
      await prisma.emailLog.update({
        where: { id: e.id },
        data: { failedAt: new Date(), failReason: String(err?.message || err) }
      });
    }
  }

  let agentReferrals = { matched: 0, paidSync: 0, payouts: 0 };
  try {
    agentReferrals = await processAgentReferralPipeline();
  } catch (e) {
    console.error("AGENT_REFERRAL_CRON_FAILED", e);
  }

  return NextResponse.json({ ok: true, sent, skipped, checked: pending.length, agentReferrals });
}