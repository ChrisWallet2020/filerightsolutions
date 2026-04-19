import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Legacy “Chris” URL — same data as Agents; keep a redirect so bookmarks do not 404. */
export default async function AdminChrisLegacyRedirect() {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");
  redirect("/admin_dashboard/agents");
}
