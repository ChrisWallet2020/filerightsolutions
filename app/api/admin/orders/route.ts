import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { EMAIL_TYPE, ORDER_STATUS, type OrderStatus } from "@/lib/constants";
import { sendFilingCompleteNotifyIfQuotedOrderPaid } from "@/lib/email/sendFilingCompleteNotifyOnQuotedOrderPaid";

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const orderId = String(form.get("orderId") || "");
  const status = String(form.get("status") || "") as OrderStatus;

  if (!orderId || !status) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (!Object.values(ORDER_STATUS).includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderId } });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status,
      ...(status === ORDER_STATUS.PAID && !order.paidAt ? { paidAt: new Date() } : {}),
    },
  });

  if (status === ORDER_STATUS.PAID) {
    await sendFilingCompleteNotifyIfQuotedOrderPaid(order.id);
  }

  // Queue emails for key transitions
  if (status === "IN_PROGRESS") {
    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.WORK_STARTED } },
      update: {},
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.WORK_STARTED,
        toEmail: order.customerEmail,
        subject: `We Started Your Tax Filing Review – Order ${order.orderId}`
      }
    });
  }

  if (status === "DONE") {
    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.COMPLETION } },
      update: {},
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.COMPLETION,
        toEmail: order.customerEmail,
        subject: `Service Completed – Order ${order.orderId}`
      }
    });
  }

  return NextResponse.redirect(new URL(`/admin/orders/${orderId}`, req.url), 303);
}