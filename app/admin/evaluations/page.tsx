// app/admin/evaluations/page.tsx
import Link from "next/link";
import { SyncReferralCreditsForm } from "@/components/admin/SyncReferralCreditsForm";
import { isAdminEvalPdfDownloadCurrent } from "@/lib/admin/adminEvalPdfDownload";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatPhilippineDateTime(v: Date | string): string {
  const d = v instanceof Date ? v : new Date(v);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
}

export default async function AdminEvaluationsPage({
  searchParams,
}: {
  searchParams?: { referralSync?: string };
}) {
  if (!isAdminAuthed()) redirect("/admin/login");

  const syncCount =
    typeof searchParams?.referralSync === "string" && /^\d+$/.test(searchParams.referralSync)
      ? Number(searchParams.referralSync)
      : null;

  const subs = await prisma.evaluation1701ASubmission.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      evaluation: { include: { user: true } },
    },
  });
  const downloadedCount = subs.filter((s) => isAdminEvalPdfDownloadCurrent(s) && s.adminPdfDownloadedAt).length;
  const notDownloadedCount = Math.max(0, subs.length - downloadedCount);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>1701A Submissions</h1>

      <p style={{ color: "#475569", fontSize: 14, marginTop: 8, maxWidth: 720, lineHeight: 1.6 }}>
        If a referred client submitted but the referrer still shows 0 credits, run sync once (fixes older
        submissions where the evaluation row was not linked to the referral).
      </p>

      <SyncReferralCreditsForm />

      <section
        className="adminCard"
        style={{
          marginTop: 14,
          padding: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          maxWidth: 520,
        }}
      >
        <div
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            background: "#f0fdf4",
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, letterSpacing: "0.01em" }}>Downloaded</div>
          <div style={{ marginTop: 2, fontSize: 22, lineHeight: 1.1, color: "#14532d", fontWeight: 800 }}>
            {downloadedCount}
          </div>
        </div>
        <div
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            background: "#f8fafc",
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, letterSpacing: "0.01em" }}>
            Not yet downloaded
          </div>
          <div style={{ marginTop: 2, fontSize: 22, lineHeight: 1.1, color: "#0f172a", fontWeight: 800 }}>
            {notDownloadedCount}
          </div>
        </div>
      </section>

      {syncCount !== null ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: 14,
          }}
        >
          Updated <b>{syncCount}</b> referral credit(s). Referrers can refresh their account Referral tab.
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {subs.map((s) => (
          <div key={s.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    {s.evaluation.user.fullName} — {s.evaluation.user.email}
                  </span>
                  {s.evaluation.submit1701aCount > 1 ? (
                    <span
                      title="Client resubmitted this evaluation"
                      aria-label="Resubmitted"
                      style={{ display: "inline-flex", color: "#b45309" }}
                    >
                      <ResubmitNoticeIcon />
                    </span>
                  ) : null}
                  {isAdminEvalPdfDownloadCurrent(s) && s.adminPdfDownloadedAt ? (
                    <span
                      title={`PDF fetched ${formatPhilippineDateTime(s.adminPdfDownloadedAt)} (PH time)`}
                      style={{
                        marginLeft: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#15803d",
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: "#dcfce7",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      Downloaded
                    </span>
                  ) : null}
                </div>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  Submitted: {formatPhilippineDateTime(s.createdAt)} (PH time)
                  {s.evaluation.submit1701aCount > 1 ? (
                    <span style={{ marginLeft: 8, color: "#b45309", fontWeight: 600 }}>
                      · Portal submit #{s.evaluation.submit1701aCount}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link href={`/admin/evaluations/${s.evaluationId}`}>View</Link>
                <a href={`/admin/evaluations/${s.evaluationId}/pdf`} style={{ fontWeight: 800 }}>
                  Download PDF
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  background: "white",
};

/** Bell — marks evaluations submitted more than once (see `Evaluation.submit1701aCount`). */
function ResubmitNoticeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}