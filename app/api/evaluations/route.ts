import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUserId } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = getAuthedUserId();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const form = await req.formData();
  const taxYear = String(form.get("taxYear") || "").trim() || null;
  const notes = String(form.get("notes") || "").trim() || null;

  // Find referral event (if this user was referred)
  const referralEvent = await prisma.referralEvent.findUnique({
    where: { referredUserId: userId }
  });

  await prisma.evaluation.create({
    data: {
      userId,
      taxYear,
      status: "SUBMITTED",
      payloadJson: notes ? JSON.stringify({ notes }) : null,
      referralEventId: referralEvent?.id ?? null
    }
  });

  // IMPORTANT POLICY: referral credit applies once the referred client completes the free evaluation
  if (referralEvent && !referralEvent.evaluationCompleted) {
    await prisma.referralEvent.update({
      where: { id: referralEvent.id },
      data: { evaluationCompleted: true }
    });
  }

  return NextResponse.redirect(new URL("/account", req.url));
}