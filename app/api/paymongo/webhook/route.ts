import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EMAIL_TYPE, ORDER_STATUS } from "@/lib/constants";

function pick(obj: any, path: string[]): any {
  let cur = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

export async function POST(req: Request) {
  const raw = await req.text();
  let evt: any = null;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventType = String(evt?.data?.attributes?.type || evt?.type || "");
  if (!eventType) return NextResponse.json({ error: "missing_event_type" }, { status: 400 });

  const paymentData =
    pick(evt, ["data", "attributes", "data", "attributes"]) ||
    pick(evt, ["data", "attributes", "data"]) ||
    {};

  const status = String(paymentData?.status || "");
  const referenceNumber = String(paymentData?.reference_number || paymentData?.referenceNumber || "").trim();
  const checkoutId = String(paymentData?.checkout_session_id || paymentData?.id || "").trim();
  const paymentMethod = String(paymentData?.payment_method_used || paymentData?.payment_method || "").trim() || null;

  const isPaidEvent =
    status.toLowerCase() === "paid" ||
    eventType === "checkout_session.payment.paid" ||
    eventType === "payment.paid";

  if (!referenceNumber) {
    return NextResponse.json({ error: "missing_reference_number" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderId: referenceNumber } });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      orderIdRef: order.orderId,
      provider: "PAYMONGO",
      method: paymentMethod,
      providerRef: checkoutId || null,
      status: status || eventType,
      rawPayload: raw,
    },
  });

  if (isPaidEvent && order.status !== ORDER_STATUS.PAID) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: ORDER_STATUS.PAID, paidAt: new Date() },
    });

    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.PAYMENT_RECEIVED } },
      update: {},
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.PAYMENT_RECEIVED,
        toEmail: order.customerEmail,
        subject: `Payment Received - Order ${order.orderId}`,
      },
    });

    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.UPLOAD_REMINDER_1 } },
      update: {},
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.UPLOAD_REMINDER_1,
        toEmail: order.customerEmail,
        subject: `Action Required: Upload Your Tax Documents - Order ${order.orderId}`,
      },
    });

    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.UPLOAD_REMINDER_2 } },
      update: {},
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.UPLOAD_REMINDER_2,
        toEmail: order.customerEmail,
        subject: `Final Reminder: Upload Your Tax Documents - Order ${order.orderId}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
