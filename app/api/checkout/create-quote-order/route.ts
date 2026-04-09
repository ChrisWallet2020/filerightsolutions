import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUserId } from "@/lib/auth";
import { generatePublicOrderId, generateUploadToken } from "@/lib/ids";
import { ORDER_STATUS } from "@/lib/constants";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { getQuotedBillingPackageId } from "@/lib/quotedBillingPackage";
import { createPayMongoCheckout } from "@/lib/paymongo";

const Schema = z.object({ quoteToken: z.string().min(16) });

export async function POST(req: Request) {
  const userId = getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { quoteToken } = parsed.data;

  const quote = await prisma.paymentQuote.findUnique({
    where: { token: quoteToken },
    include: { resultOrder: true },
  });

  if (!quote || quote.userId !== userId) {
    return NextResponse.json({ error: "quote_not_found" }, { status: 404 });
  }

  if (quote.expiresAt && quote.expiresAt < new Date()) {
    return NextResponse.json({ error: "quote_expired" }, { status: 410 });
  }

  if (quote.status === "CANCELLED") {
    return NextResponse.json({ error: "quote_cancelled" }, { status: 410 });
  }

  if (quote.status === "ORDER_CREATED" && quote.resultOrderDbId && quote.resultOrder) {
    const ord = quote.resultOrder;
    if (ord.status === ORDER_STATUS.PAID) {
      return NextResponse.json({ error: "already_paid" }, { status: 400 });
    }

    try {
      const checkout = await createPayMongoCheckout({
        orderId: ord.orderId,
        amountPhp: ord.amountPhp,
        customerName: ord.customerName,
        customerEmail: ord.customerEmail,
      });

      await prisma.payment.create({
        data: {
          orderId: ord.id,
          orderIdRef: ord.orderId,
          provider: "PAYMONGO",
          method: null,
          providerRef: checkout.checkoutId,
          status: "INITIATED",
          rawPayload: checkout.rawResponse,
        },
      });

      return NextResponse.json({
        ok: true,
        reused: true,
        order: { orderId: ord.orderId, status: ord.status, amountPhp: ord.amountPhp },
        paymentInstruction: {
          provider: "PAYMONGO",
          reference: ord.orderId,
          amountPhp: ord.amountPhp,
          nextUrl: checkout.checkoutUrl,
        },
      });
    } catch (e: unknown) {
      const msg = String((e as Error)?.message || e);
      if (msg.includes("PAYMONGO_NOT_CONFIGURED")) {
        return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
      }
      console.error("PAYMONGO_CREATE_REUSE_CHECKOUT_FAILED", e);
      return NextResponse.json({ error: "payment_provider_error" }, { status: 502 });
    }
  }

  if (quote.status !== "OPEN") {
    return NextResponse.json({ error: "quote_unavailable" }, { status: 400 });
  }

  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: userId, evaluationCompleted: true },
  });

  const totals = computeQuotedPaymentTotals(quote.baseAmountPhp, confirmedCredits);
  if (totals.finalAmountPhp <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const pkgId = await getQuotedBillingPackageId();

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const q = await tx.paymentQuote.findFirst({
        where: { id: quote.id, userId, status: "OPEN" },
      });
      if (!q) {
        throw new Error("QUOTE_TAKEN");
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("NO_USER");
      }

      let orderId = "";
      let uploadToken = "";
      let created: { id: string; orderId: string; status: string; amountPhp: number } | null = null;

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          orderId = generatePublicOrderId("TX");
          uploadToken = generateUploadToken();

          created = await tx.order.create({
            data: {
              orderId,
              status: ORDER_STATUS.PENDING,
              amountPhp: totals.finalAmountPhp,
              customerName: user.fullName,
              customerEmail: user.email,
              customerPhone: user.phone || null,
              uploadToken,
              packageId: pkgId,
              payments: {
                create: {
                  orderIdRef: orderId,
                  provider: "PAYMONGO",
                  method: null,
                  providerRef: null,
                  status: "INITIATED",
                  rawPayload: JSON.stringify({
                    note: "Quoted billing order. Awaiting PayMongo checkout creation.",
                    quoteId: quote.id,
                    baseAmountPhp: totals.baseAmountPhp,
                    discountPhp: totals.discountPhp,
                    createdAt: new Date().toISOString(),
                  }),
                },
              },
            },
            select: {
              id: true,
              orderId: true,
              status: true,
              amountPhp: true,
            },
          });
          break;
        } catch (e: unknown) {
          const msg = String((e as Error)?.message || e);
          if (msg.includes("Unique constraint") || msg.includes("UNIQUE constraint")) {
            if (attempt === 5) throw e;
            continue;
          }
          throw e;
        }
      }

      if (!created) {
        throw new Error("ORDER_CREATE_FAILED");
      }

      await tx.paymentQuote.update({
        where: { id: quote.id },
        data: {
          status: "ORDER_CREATED",
          resultOrderDbId: created.id,
          appliedDiscountPhp: totals.discountPhp,
          finalChargedPhp: totals.finalAmountPhp,
        },
      });

      return created;
    });

    const dbOrder = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      select: { id: true, orderId: true, amountPhp: true, customerName: true, customerEmail: true },
    });
    if (!dbOrder) {
      return NextResponse.json({ error: "order_not_found" }, { status: 500 });
    }

    let checkout;
    try {
      checkout = await createPayMongoCheckout({
        orderId: dbOrder.orderId,
        amountPhp: dbOrder.amountPhp,
        customerName: dbOrder.customerName,
        customerEmail: dbOrder.customerEmail,
      });
    } catch (e: unknown) {
      const msg = String((e as Error)?.message || e);
      if (msg.includes("PAYMONGO_NOT_CONFIGURED")) {
        return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
      }
      console.error("PAYMONGO_CREATE_QUOTE_CHECKOUT_FAILED", e);
      return NextResponse.json({ error: "payment_provider_error" }, { status: 502 });
    }

    await prisma.payment.updateMany({
      where: { orderId: createdOrder.id, orderIdRef: createdOrder.orderId, status: "INITIATED" },
      data: {
        providerRef: checkout.checkoutId,
        rawPayload: checkout.rawResponse,
      },
    });

    return NextResponse.json({
      ok: true,
      order: createdOrder,
      paymentInstruction: {
        provider: "PAYMONGO",
        reference: createdOrder.orderId,
        amountPhp: createdOrder.amountPhp,
        nextUrl: checkout.checkoutUrl,
      },
    });
  } catch (e: unknown) {
    if (String((e as Error)?.message) === "QUOTE_TAKEN") {
      return NextResponse.json({ error: "quote_unavailable" }, { status: 409 });
    }
    console.error("CREATE_QUOTE_ORDER", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
