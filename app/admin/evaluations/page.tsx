// app/admin/evaluations/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationsPage() {
  if (!isAdminAuthed()) redirect("/admin/login");

  const subs = await prisma.evaluation1701ASubmission.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      evaluation: { include: { user: true } },
    },
  });

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      <h1>1701A Submissions</h1>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {subs.map((s) => (
          <div key={s.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {s.evaluation.user.fullName} — {s.evaluation.user.email}
                </div>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  Submitted: {new Date(s.createdAt).toLocaleString()}
                </div>
                <div style={{ color: "#475569", fontSize: 13 }}>
                  Evaluation ID: {s.evaluationId}
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