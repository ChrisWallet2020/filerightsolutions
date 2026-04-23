import Link from "next/link";
import { isProcessor1EvalPdfDownloadCurrent } from "@/lib/admin/adminEvalPdfDownload";
import { prisma } from "@/lib/db";
import { isProcessor1Authed } from "@/lib/auth";
import { getProcessor1Credentials } from "@/lib/siteSettings";
import { redirect } from "next/navigation";
import { SubmittedClientNameSearch } from "@/components/admin/SubmittedClientNameSearch";

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

export default async function Processor1EvaluationsPage({
  searchParams,
}: {
  searchParams?: { referralSync?: string; q?: string; downloadAll?: string };
}) {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) redirect("/processor1_dashboard/login");

  const syncCount =
    typeof searchParams?.referralSync === "string" && /^\d+$/.test(searchParams.referralSync)
      ? Number(searchParams.referralSync)
      : null;
  const rawQuery = typeof searchParams?.q === "string" ? searchParams.q : "";
  const query = rawQuery.trim().toLowerCase();
  const referralSyncQs =
    typeof searchParams?.referralSync === "string" && searchParams.referralSync.trim()
      ? `?referralSync=${encodeURIComponent(searchParams.referralSync.trim())}`
      : "";
  const showAllHref = `/processor1_dashboard/evaluations${referralSyncQs}`;

  const allSubs = await prisma.evaluation1701ASubmission.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      evaluation: { include: { user: true } },
    },
  });
  const submittedClientOptions = Array.from(
    new Map(
      allSubs.map((s) => {
        const fullName = s.evaluation.user.fullName.trim();
        const email = s.evaluation.user.email.trim();
        return [email.toLowerCase(), { fullName, email }];
      }),
    ).values(),
  ).sort((a, b) => a.fullName.localeCompare(b.fullName, "en-PH", { sensitivity: "base" }));
  const subs = query
    ? allSubs.filter((s) => {
        const name = s.evaluation.user.fullName.toLowerCase();
        return name.includes(query);
      })
    : allSubs;
  const downloadedCount = subs.filter((s) => isProcessor1EvalPdfDownloadCurrent(s) && s.processor1PdfDownloadedAt)
    .length;
  const notDownloadedCount = Math.max(0, subs.length - downloadedCount);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>1701A Submissions</h1>
      <p style={{ color: "#475569", fontSize: 14, marginTop: 8, lineHeight: 1.55, maxWidth: 900 }}>
        This tab lists client-submitted 1701A evaluations so you can open each record and download its verbatim PDF as entered in the portal.
      </p>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          width: "100%",
          maxWidth: 900,
          overflow: "visible",
        }}
      >
        <SubmittedClientNameSearch options={submittedClientOptions} defaultValue={rawQuery} />
      </div>
      <section style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <form action="/api/admin/evaluations/download-all" method="get">
          <button
            type="submit"
            style={{
              minHeight: 42,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: "#1e40af",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Download all
          </button>
        </form>
        <div
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            background: "#f0fdf4",
            minHeight: 42,
            padding: "10px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#166534", fontWeight: 700, letterSpacing: "0.01em" }}>Downloaded</span>
          <span style={{ fontSize: 18, lineHeight: 1, color: "#14532d", fontWeight: 800 }}>{downloadedCount}</span>
        </div>
        <div
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            background: "#f8fafc",
            minHeight: 42,
            padding: "10px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 700, letterSpacing: "0.01em" }}>
            Not yet downloaded
          </span>
          <span style={{ fontSize: 18, lineHeight: 1, color: "#0f172a", fontWeight: 800 }}>{notDownloadedCount}</span>
        </div>
      </section>
      <p
        style={{
          marginTop: 8,
          color: "#475569",
          fontSize: 12,
          lineHeight: 1.5,
          maxWidth: "100%",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        <b>Download all</b> creates one ZIP containing up to <b>20</b> of the oldest submissions that are not yet marked as downloaded here for their current submit version.
      </p>
      {searchParams?.downloadAll === "none" ? (
        <p
          style={{
            marginTop: 10,
            color: "#92400e",
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: "100%",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          Nothing to download: every submission is already marked as downloaded on processor 1 for its current submit version.
        </p>
      ) : null}
      {searchParams?.downloadAll === "unavailable" ? (
        <p style={{ marginTop: 10, color: "#b91c1c", fontSize: 13, lineHeight: 1.5, maxWidth: 780 }}>
          ZIP was not created because no PDF bytes could be read for the pending rows (check server logs).
        </p>
      ) : null}
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
      {query ? (
        <div style={{ marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
          <span>
            Showing {subs.length} of {allSubs.length} submission(s) for <b>{rawQuery.trim()}</b>.{" "}
          </span>
          <Link href={showAllHref} prefetch={false} style={{ fontWeight: 700, color: "#1d4ed8" }}>
            Show all submissions
          </Link>
        </div>
      ) : null}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {subs.map((s) => (
          <div key={s.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                  {isProcessor1EvalPdfDownloadCurrent(s) && s.processor1PdfDownloadedAt ? (
                    <span
                      title={`PDF fetched ${formatPhilippineDateTime(s.processor1PdfDownloadedAt)} (PH time)`}
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
                <Link href={`/processor1_dashboard/evaluations/${s.evaluationId}`}>View</Link>
                <a href={`/processor1_dashboard/evaluations/${s.evaluationId}/pdf`} style={{ fontWeight: 800 }}>
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
