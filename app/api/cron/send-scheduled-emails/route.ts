// app/api/cron/send-scheduled-emails/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import {
  BILLING_EMAIL_FOOTER_TEXT,
  billingEmailFooterHtml,
  textToEmailHtmlParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";

export async function POST(req: Request) {
  const key = req.headers.get("x-cron-key");
  if (process.env.CRON_KEY && key !== process.env.CRON_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const batch = await prisma.scheduledEmail.findMany({
    where: {
      sendAt: { lte: now },
      sentAt: null,
      failedAt: null,
    },
    take: 25,
  });

  for (const e of batch) {
    try {
      const shouldUseBillingFooter = e.type === "EVALUATION_NO_REDUCTION_UPDATE";
      const textBody = shouldUseBillingFooter ? `${e.body}\n\n${BILLING_EMAIL_FOOTER_TEXT}` : e.body;
      const htmlInner = shouldUseBillingFooter
        ? `${textToEmailHtmlParagraphs(e.body)}${billingEmailFooterHtml()}`
        : textToEmailHtmlParagraphs(e.body);
      const htmlBody = wrapEmailMainHtml(htmlInner);

      await sendMail(e.toEmail, e.subject, textBody, htmlBody);
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: { sentAt: new Date() },
      });
    } catch (err: any) {
      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: { failedAt: new Date(), failReason: err?.message || "Send failed" },
      });
    }
  }

  return NextResponse.json({ processed: batch.length });
}
