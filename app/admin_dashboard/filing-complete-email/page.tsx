import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminFilingCompleteEmailPage() {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");
  redirect("/processor2_dashboard/filing-complete-email");
}
