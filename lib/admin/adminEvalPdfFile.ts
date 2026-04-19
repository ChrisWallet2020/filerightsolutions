import fs from "fs/promises";
import { generate1701aPdf } from "@/lib/pdf1701a";

const INLINE_MARKER = "__inline__/";
const INLINE_CLIENT_MARKER = "__inline_client__/";

export function buildSuggestedFilename(fullName: string | null | undefined, evaluationId: string): string {
  const cleanedName = (fullName || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedName) return `evaluation_${cleanedName}.pdf`;
  return `evaluation_${evaluationId}.pdf`;
}

/** Processed PDF (business rules) vs client snapshot (verbatim portal fields). */
export type EvalPdfVariant = "processed" | "client_snapshot";

type PdfSourceSubmission = {
  evaluationId: string;
  pdfPath: string;
  pdfMimeType: string | null;
  payloadJson: string | null;
  clientSnapshotPdfPath?: string | null;
  clientSnapshotPdfFilename?: string | null;
  clientSnapshotPdfMimeType?: string | null;
  evaluation: {
    submit1701aCount: number;
    user: {
      email: string | null;
      fullName: string | null;
    };
  };
};

/** Returns bytes + metadata from the latest source (payload JSON first, file fallback). */
export async function readEvaluationPdfBytes(
  sub: PdfSourceSubmission,
  variant: EvalPdfVariant = "processed",
): Promise<{
  bytes: Buffer;
  mimeType: string;
  submitOrdinal: number;
}> {
  const submitOrdinal = sub.evaluation.submit1701aCount ?? 0;

  if (variant === "client_snapshot") {
    const snapPath = sub.clientSnapshotPdfPath?.trim();
    if (snapPath && !snapPath.startsWith(INLINE_CLIENT_MARKER)) {
      try {
        const bytes = await fs.readFile(snapPath);
        return {
          bytes,
          mimeType: sub.clientSnapshotPdfMimeType || "application/pdf",
          submitOrdinal,
        };
      } catch (e) {
        console.error("CLIENT_SNAPSHOT_PDF_READ_FAILED:", { evaluationId: sub.evaluationId, error: e });
      }
    }
    if (sub.payloadJson?.trim()) {
      try {
        const payload = JSON.parse(sub.payloadJson) as Record<string, unknown>;
        const pdfBytes = await generate1701aPdf(payload, {
          accountEmail: sub.evaluation.user?.email ?? null,
          submit1701aCount: sub.evaluation.submit1701aCount ?? null,
          renderMode: "verbatim",
        });
        return {
          bytes: Buffer.from(pdfBytes),
          mimeType: "application/pdf",
          submitOrdinal,
        };
      } catch (e) {
        console.error("CLIENT_SNAPSHOT_PDF_REGENERATE_FAILED:", e);
      }
    }
    throw new Error("Client snapshot PDF not available");
  }

  if (sub.payloadJson?.trim()) {
    try {
      const payload = JSON.parse(sub.payloadJson) as Record<string, unknown>;
      const pdfBytes = await generate1701aPdf(payload, {
        accountEmail: sub.evaluation.user?.email ?? null,
        submit1701aCount: sub.evaluation.submit1701aCount ?? null,
        renderMode: "processed",
      });
      return {
        bytes: Buffer.from(pdfBytes),
        mimeType: "application/pdf",
        submitOrdinal,
      };
    } catch (e) {
      console.error("ADMIN_EVAL_PDF_REGENERATE_FAILED:", e);
    }
  }

  if (sub.pdfPath.startsWith(INLINE_MARKER)) {
    throw new Error("PDF not available");
  }

  const bytes = await fs.readFile(sub.pdfPath);
  return {
    bytes,
    mimeType: sub.pdfMimeType || "application/pdf",
    submitOrdinal,
  };
}
