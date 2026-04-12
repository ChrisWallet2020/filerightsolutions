import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDragonpayPayload } from "@/lib/dragonpay/verify";
import { EMAIL_TYPE, ORDER_STATUS } from "@/lib/constants";
import { config } from "@/lib/config";
import { sendFilingCompleteNotifyIfQuotedOrderPaid } from "@/lib/email/sendFilingCompleteNotifyOnQuotedOrderPaid";

export async function POST(req: Request) {
  if (!config.dragonpay.secret) {
    // No Dragonpay integration yet; keep endpoint non-failing for deployment checks.
    return NextResponse.json({ ok: true, skipped: "dragonpay_not_configured" });
  }

  const raw = await req.text();
  const sig = req.headers.get("x-signature");

  // Placeholder validation
  const ok = verifyDragonpayPayload(raw, sig);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  // Parse minimal payload (placeholder)
  // You will replace this parser based on Dragonpay docs: orderId, status, providerRef, method
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const orderId = String(parsed.orderId || "");
  const payStatus = String(parsed.status || "PAID");
  const providerRef = String(parsed.providerRef || "");
  const method = String(parsed.method || "GCASH");

  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Idempotent transition
  if (order.status !== ORDER_STATUS.PAID) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: ORDER_STATUS.PAID, paidAt: new Date() }
    });
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      orderIdRef: order.orderId,
      provider: "Dragonpay",
      method,
      providerRef,
      status: payStatus,
      rawPayload: raw
    }
  });

  // Queue email logs (idempotent due to unique constraint)
  const pkg = await prisma.servicePackage.findUnique({ where: { id: order.packageId } });
  const uploadLink = `${config.baseUrl}/upload/${order.uploadToken}`;

  await prisma.emailLog.upsert({
    where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.PAYMENT_RECEIVED } },
    update: {},
    create: {
      orderId: order.id,
      type: EMAIL_TYPE.PAYMENT_RECEIVED,
      toEmail: order.customerEmail,
      subject: `Payment Received – Order ${order.orderId}`
    }
  });

  // We’ll use reminders instead of immediate 2nd email to avoid back-to-back.
  await prisma.emailLog.upsert({
    where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.UPLOAD_REMINDER_1 } },
    update: {},
    create: {
      orderId: order.id,
      type: EMAIL_TYPE.UPLOAD_REMINDER_1,
      toEmail: order.customerEmail,
      subject: `Action Required: Upload Your Tax Documents – Order ${order.orderId}`
    }
  });

  await prisma.emailLog.upsert({
    where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.UPLOAD_REMINDER_2 } },
    update: {},
    create: {
      orderId: order.id,
      type: EMAIL_TYPE.UPLOAD_REMINDER_2,
      toEmail: order.customerEmail,
      subject: `Final Reminder: Upload Your Tax Documents – Order ${order.orderId}`
    }
  });

  const paidOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { id: true, status: true },
  });
  if (paidOrder?.status === ORDER_STATUS.PAID) {
    await sendFilingCompleteNotifyIfQuotedOrderPaid(order.id);
  }

  return NextResponse.json({ ok: true, uploadLink });
}