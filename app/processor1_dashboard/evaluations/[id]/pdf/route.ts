import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isProcessor1Authed } from "@/lib/auth";
import { buildSuggestedFilename, readEvaluationPdfBytes } from "@/lib/admin/adminEvalPdfFile";
import { getProcessor1Credentials } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) return new NextResponse("Unauthorized", { status: 401 });

  const evaluationId = params.id;
  const sub = await prisma.evaluation1701ASubmission.findUnique({
    where: { evaluationId },
    include: { evaluation: { include: { user: true } } },
  });
  if (!sub) return new NextResponse("Not found", { status: 404 });
  try {
    const pdf = await readEvaluationPdfBytes(sub, "client_snapshot");
    await prisma.evaluation1701ASubmission.update({
      where: { evaluationId },
      data: {
        processor1PdfDownloadedAt: new Date(),
        processor1PdfDownloadedSubmitOrdinal: pdf.submitOrdinal,
      },
    });
    const filename = buildSuggestedFilename(sub.evaluation.user?.fullName, evaluationId);
    return new NextResponse(pdf.bytes, {
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
