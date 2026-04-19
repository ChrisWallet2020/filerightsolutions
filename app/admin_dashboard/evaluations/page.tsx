import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationsPage({
  searchParams,
}: {
  searchParams?: { referralSync?: string; q?: string };
}) {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");
  const qs = new URLSearchParams();
  if (typeof searchParams?.referralSync === "string") qs.set("referralSync", searchParams.referralSync);
  if (typeof searchParams?.q === "string") qs.set("q", searchParams.q);
  redirect(`/processor2_dashboard/evaluations${qs.toString() ? `?${qs.toString()}` : ""}`);
}