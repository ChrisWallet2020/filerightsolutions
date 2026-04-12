/** True when admin fetched the PDF for the current portal-submit generation (`submit1701aCount`). */
export function isAdminEvalPdfDownloadCurrent(sub: {
  adminPdfDownloadedAt: Date | null;
  adminPdfDownloadedSubmitOrdinal: number | null;
  evaluation: { submit1701aCount: number };
}): boolean {
  const count = sub.evaluation.submit1701aCount ?? 0;
  if (!sub.adminPdfDownloadedAt) return false;
  if (sub.adminPdfDownloadedSubmitOrdinal == null) {
    return count <= 1;
  }
  return sub.adminPdfDownloadedSubmitOrdinal === count;
}
