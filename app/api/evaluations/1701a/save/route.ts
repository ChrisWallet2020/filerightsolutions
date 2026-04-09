import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUserId } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const userId = getAuthedUserId();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { evaluationId, payload } = body;

    if (!evaluationId || !payload) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    // Ensure evaluation belongs to user
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        id: evaluationId,
        userId,
      },
      include: {
        submission1701A: true,
      },
    });

    if (!evaluation) {
      return new NextResponse("Evaluation not found", { status: 404 });
    }
    const payloadJson = JSON.stringify(payload);
    await prisma.$transaction(async (tx) => {
      await tx.evaluation.update({
        where: { id: evaluationId },
        data: { payloadJson },
      });

      // Keep submitted snapshot editable as requested by user.
      if (evaluation.submission1701A) {
        await tx.evaluation1701ASubmission.update({
          where: { evaluationId },
          data: { payloadJson },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}