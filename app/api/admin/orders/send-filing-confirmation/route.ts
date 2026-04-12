import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { sendFilingCompleteNotifyIfQuotedOrderPaid } from "@/lib/email/sendFilingCompleteNotifyOnQuotedOrderPaid";

/** Idempotent: sends only for quoted-billing PAID orders when FILING_COMPLETE_NOTIFY not already sent. */
export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const orderId = String(form.get("orderId") || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "missing_order" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderId } });
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.status !== ORDER_STATUS.PAID) {
    return NextResponse.redirect(new URL(`/admin/orders/${orderId}?filingEmail=not_paid`, req.url), 303);
  }

  await sendFilingCompleteNotifyIfQuotedOrderPaid(order.id);

  return NextResponse.redirect(new URL(`/admin/orders/${orderId}?filingEmail=attempted`, req.url), 303);
}
