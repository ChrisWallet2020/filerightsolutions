// app/admin/evaluations/page.tsx
import Link from "next/link";
import { SyncReferralCreditsForm } from "@/components/admin/SyncReferralCreditsForm";
import { isAdminEvalPdfDownloadCurrent } from "@/lib/admin/adminEvalPdfDownload";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>1701A Submissions</h1>

      <p style={{ color: "#475569", fontSize: 14, marginTop: 8, maxWidth: 720, lineHeight: 1.6 }}>
        If a referred client submitted but the referrer still shows 0 credits, run sync once (fixes older
        submissions where the evaluation row was not linked to the referral).
      </p>

      <SyncReferralCreditsForm />

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
                      title={`PDF fetched ${new Date(s.adminPdfDownloadedAt).toLocaleString()}`}
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
                  Submitted: {new Date(s.createdAt).toLocaleString()}
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