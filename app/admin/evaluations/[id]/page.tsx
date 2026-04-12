// app/admin/evaluations/[id]/page.tsx
import { isAdminEvalPdfDownloadCurrent } from "@/lib/admin/adminEvalPdfDownload";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminEvaluationDetailPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthed()) redirect("/admin/login");

  const evaluationId = params.id;

  const sub = await prisma.evaluation1701ASubmission.findUnique({
    where: { evaluationId },
    include: { evaluation: { include: { user: true } } },
  });

  if (!sub) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px" }}>
        <h1>Not found</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Evaluation Detail</h1>
      <p style={{ color: "#475569" }}>
        <b>{sub.evaluation.user.fullName}</b> ({sub.evaluation.user.email})
      </p>

      <p style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <a href={`/admin/evaluations/${evaluationId}/pdf`} style={{ fontWeight: 900 }}>
          Download PDF
        </a>
        {isAdminEvalPdfDownloadCurrent(sub) && sub.adminPdfDownloadedAt ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#15803d",
              padding: "4px 10px",
              borderRadius: 8,
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
            }}
            title={new Date(sub.adminPdfDownloadedAt).toLocaleString()}
          >
            Downloaded
          </span>
        ) : null}
      </p>

      <section style={{ marginTop: 14, border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "white" }}>
        <h3 style={{ marginTop: 0 }}>Raw Payload JSON</h3>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontSize: 12 }}>
          {sub.payloadJson}
        </pre>
      </section>
    </main>
  );
}