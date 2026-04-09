import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generatePublicOrderId, generateUploadToken } from "@/lib/ids";
import { ORDER_STATUS } from "@/lib/constants";

const CreateOrderSchema = z.object({
  packageId: z.string().min(1, "packageId is required"),
  customerName: z.string().min(2, "Name is required").max(120),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(7).max(30).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { packageId, customerName, customerEmail, customerPhone } = parsed.data;

    const pkg = await prisma.servicePackage.findFirst({
      where: { id: packageId, isActive: true },
      select: {
        id: true,
        name: true,
        pricePhp: true,
        isActive: true,
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { ok: false, error: "PACKAGE_NOT_FOUND_OR_INACTIVE" },
        { status: 404 }
      );
    }

    // Generate unique public orderId + unique uploadToken
    // Retry a few times in rare collision cases.
    let orderId = "";
    let uploadToken = "";
    let createdOrder: any = null;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        orderId = generatePublicOrderId("TX");
        uploadToken = generateUploadToken();

        createdOrder = await prisma.order.create({
          data: {
            orderId,
            status: ORDER_STATUS.PENDING,
            amountPhp: pkg.pricePhp,
            customerName,
            customerEmail,
            customerPhone: customerPhone || null,
            uploadToken,
            packageId: pkg.id,

            // Track an initial payment attempt (not paid yet)
            payments: {
              create: {
                orderIdRef: orderId, // public reference
                provider: "DRAGONPAY",
                method: "GCASH",
                providerRef: null,
                status: "INITIATED",
                rawPayload: JSON.stringify({
                  note: "Order created. Awaiting Dragonpay payment initiation/webhook.",
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
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            createdAt: true,
            pkg: { select: { id: true, name: true } },
          },
        });

        break; // success
      } catch (e: any) {
        // Unique constraint collisions -> retry
        const msg = String(e?.message || "");
        if (msg.includes("Unique constraint") || msg.includes("UNIQUE constraint")) {
          if (attempt === 5) throw e;
          continue;
        }
        throw e;
      }
    }

    // In MVP: we return an instruction payload.
    // Later you’ll replace this with real Dragonpay redirect URL generation.
    const paymentInstruction = {
      provider: "DRAGONPAY",
      recommendedMethod: "GCASH",
      reference: createdOrder.orderId,
      amountPhp: createdOrder.amountPhp,
      // Placeholder route you can build next:
      // show "Pay via Dragonpay" and instructions + check status
      nextUrl: `/payment/status?orderId=${encodeURIComponent(createdOrder.orderId)}`,
    };

    return NextResponse.json({
      ok: true,
      order: createdOrder,
      paymentInstruction,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "SERVER_ERROR",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}