import JSZip from "jszip";
import { NextResponse } from "next/server";
import { isAdminAuthed, isProcessor1Authed, isProcessor2Authed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildSuggestedFilename,
  readEvaluationPdfBytes,
  type EvalPdfVariant,
} from "@/lib/admin/adminEvalPdfFile";
import {
  isProcessor1EvalPdfDownloadCurrent,
  isProcessor2EvalPdfDownloadCurrent,
} from "@/lib/admin/adminEvalPdfDownload";
import { getProcessor1Credentials, getProcessor2Credentials } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

const MAX_PER_ZIP = 20;

function evaluationsReturnUrl(req: Request): URL {
  const referer = req.headers.get("referer") || "";
  const path = referer.includes("/processor1_dashboard")
    ? "/processor1_dashboard/evaluations"
    : "/processor2_dashboard/evaluations";
  return new URL(path, req.url);
}

function zipPdfVariant(req: Request): EvalPdfVariant {
  const referer = req.headers.get("referer") || "";
  return referer.includes("/processor1_dashboard") ? "client_snapshot" : "processed";
}

function isProcessor1DownloadContext(req: Request): boolean {
  return (req.headers.get("referer") || "").includes("/processor1_dashboard");
}

export async function GET(req: Request) {
  const [processor1, processor2] = await Promise.all([getProcessor1Credentials(), getProcessor2Credentials()]);
  if (
    !isAdminAuthed() &&
    !isProcessor1Authed(processor1.username) &&
    !isProcessor2Authed(processor2.username)
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const allSubs = await prisma.evaluation1701ASubmission.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      evaluation: {
        include: {
          user: true,
        },
      },
    },
  });

  const fromP1 = isProcessor1DownloadContext(req);
  const pendingSubs = allSubs
    .filter((sub) =>
      fromP1 ? !isProcessor1EvalPdfDownloadCurrent(sub) : !isProcessor2EvalPdfDownloadCurrent(sub),
    )
    .slice(0, MAX_PER_ZIP);
  if (!pendingSubs.length) {
    const u = evaluationsReturnUrl(req);
    u.searchParams.set("downloadAll", "none");
    return NextResponse.redirect(u, 303);
  }

  const zip = new JSZip();
  const variant = zipPdfVariant(req);
  const updatedRows: { evaluationId: string; submitOrdinal: number }[] = [];

  for (const sub of pendingSubs) {
    try {
      const pdf = await readEvaluationPdfBytes(sub, variant);
      const baseFilename = buildSuggestedFilename(sub.evaluation.user?.fullName, sub.evaluationId).replace(
        /\.pdf$/i,
        "",
      );
      zip.file(`${baseFilename}_${sub.evaluationId}.pdf`, pdf.bytes);
      updatedRows.push({ evaluationId: sub.evaluationId, submitOrdinal: pdf.submitOrdinal });
    } catch (e) {
      console.error("ADMIN_EVAL_ZIP_ITEM_FAILED:", { evaluationId: sub.evaluationId, error: e });
    }
  }

  if (!updatedRows.length) {
    const u = evaluationsReturnUrl(req);
    u.searchParams.set("downloadAll", "unavailable");
    return NextResponse.redirect(u, 303);
  }

  const downloadedAt = new Date();
  await prisma.$transaction(
    updatedRows.map((row) =>
      prisma.evaluation1701ASubmission.update({
        where: { evaluationId: row.evaluationId },
        data: fromP1
          ? {
              processor1PdfDownloadedAt: downloadedAt,
              processor1PdfDownloadedSubmitOrdinal: row.submitOrdinal,
            }
          : {
              processor2PdfDownloadedAt: downloadedAt,
              processor2PdfDownloadedSubmitOrdinal: row.submitOrdinal,
            },
      }),
    ),
  );

  const zipBytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(downloadedAt)
    .replace(/[ :]/g, "-");

  return new NextResponse(zipBytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="evaluations_pending_oldest_${updatedRows.length}_${stamp}.zip"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
