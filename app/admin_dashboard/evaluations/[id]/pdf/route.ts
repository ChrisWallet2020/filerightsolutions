import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed, isProcessor1Authed, isProcessor2Authed } from "@/lib/auth";
import { buildSuggestedFilename, readEvaluationPdfBytes } from "@/lib/admin/adminEvalPdfFile";
import { bufferAsResponseBody } from "@/lib/nextResponseBody";
import { getProcessor1Credentials, getProcessor2Credentials } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const [processor1, processor2] = await Promise.all([getProcessor1Credentials(), getProcessor2Credentials()]);
  if (
    !isAdminAuthed() &&
    !isProcessor1Authed(processor1.username) &&
    !isProcessor2Authed(processor2.username)
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const evaluationId = params.id;

  const sub = await prisma.evaluation1701ASubmission.findUnique({
    where: { evaluationId },
    include: {
      evaluation: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!sub) return new NextResponse("Not found", { status: 404 });

  try {
    const pdf = await readEvaluationPdfBytes(sub);
    await prisma.evaluation1701ASubmission.update({
      where: { evaluationId },
      data: {
        adminPdfDownloadedAt: new Date(),
        adminPdfDownloadedSubmitOrdinal: pdf.submitOrdinal,
      },
    });
    const filename = buildSuggestedFilename(sub.evaluation.user?.fullName, evaluationId);
    return new NextResponse(bufferAsResponseBody(pdf.bytes), {
      headers: {
        "Content-Type": pdf.mimeType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return new NextResponse("PDF file not available", { status: 404 });
  }
}
