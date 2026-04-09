import { NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { generate1701aPdf } from "@/lib/pdf1701a";

export const dynamic = "force-dynamic";

function buildSuggestedFilename(fullName: string | null | undefined, evaluationId: string): string {
  const cleanedName = (fullName || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedName) return `evaluation_${cleanedName}.pdf`;
  return `evaluation_${evaluationId}.pdf`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!isAdminAuthed()) return new NextResponse("Unauthorized", { status: 401 });

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

  /** Prefer regenerating from JSON so downloads always match portal fields (Page 1 + Page 2). */
  if (sub.payloadJson?.trim()) {
    try {
      const payload = JSON.parse(sub.payloadJson) as Record<string, unknown>;
      const pdfBytes = await generate1701aPdf(payload);
      const filename = buildSuggestedFilename(sub.evaluation.user?.fullName, evaluationId);
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (e) {
      console.error("ADMIN_EVAL_PDF_REGENERATE_FAILED:", e);
    }
  }

  try {
    const bytes = await fs.readFile(sub.pdfPath);
    const filename = buildSuggestedFilename(sub.evaluation.user?.fullName, evaluationId);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": sub.pdfMimeType || "application/pdf",
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
