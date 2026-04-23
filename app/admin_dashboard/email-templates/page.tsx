import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { listClientEmailTemplates } from "@/lib/admin/clientEmailTemplates";
import { EmailTemplatesManager } from "@/components/admin/EmailTemplatesManager";

export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");
  const templates = await listClientEmailTemplates();
  return <EmailTemplatesManager templates={templates} />;
}
