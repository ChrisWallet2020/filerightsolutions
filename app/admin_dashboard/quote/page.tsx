import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { QuoteWorkspace } from "@/components/admin/QuoteWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminQuotePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");

  return <QuoteWorkspace searchParams={searchParams} quoteUploaderRole="admin" />;
}
