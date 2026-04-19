type DownloadFields = {
  downloadedAt: Date | null;
  downloadedSubmitOrdinal: number | null;
};

function isEvalPdfDownloadCurrent(
  fields: DownloadFields,
  evaluation: { submit1701aCount: number },
): boolean {
  const count = evaluation.submit1701aCount ?? 0;
  if (!fields.downloadedAt) return false;
  if (fields.downloadedSubmitOrdinal == null) {
    return count <= 1;
  }
  return fields.downloadedSubmitOrdinal === count;
}

/** Admin GET /admin/evaluations/[id]/pdf */
export function isAdminEvalPdfDownloadCurrent(sub: {
  adminPdfDownloadedAt: Date | null;
  adminPdfDownloadedSubmitOrdinal: number | null;
  evaluation: { submit1701aCount: number };
}): boolean {
  return isEvalPdfDownloadCurrent(
    {
      downloadedAt: sub.adminPdfDownloadedAt,
      downloadedSubmitOrdinal: sub.adminPdfDownloadedSubmitOrdinal,
    },
    sub.evaluation,
  );
}

/** Processor1 dashboard (client snapshot PDF). */
export function isProcessor1EvalPdfDownloadCurrent(sub: {
  processor1PdfDownloadedAt: Date | null;
  processor1PdfDownloadedSubmitOrdinal: number | null;
  evaluation: { submit1701aCount: number };
}): boolean {
  return isEvalPdfDownloadCurrent(
    {
      downloadedAt: sub.processor1PdfDownloadedAt,
      downloadedSubmitOrdinal: sub.processor1PdfDownloadedSubmitOrdinal,
    },
    sub.evaluation,
  );
}

/** Processor2 dashboard (processed PDF). */
export function isProcessor2EvalPdfDownloadCurrent(sub: {
  processor2PdfDownloadedAt: Date | null;
  processor2PdfDownloadedSubmitOrdinal: number | null;
  evaluation: { submit1701aCount: number };
}): boolean {
  return isEvalPdfDownloadCurrent(
    {
      downloadedAt: sub.processor2PdfDownloadedAt,
      downloadedSubmitOrdinal: sub.processor2PdfDownloadedSubmitOrdinal,
    },
    sub.evaluation,
  );
}
