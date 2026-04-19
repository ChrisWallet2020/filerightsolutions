import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminEvaluationDetailPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthed()) redirect("/admin/login");
  redirect(`/processor2_dashboard/evaluations/${params.id}`);
}