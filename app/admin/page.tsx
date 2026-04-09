import { isAdminAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }
  redirect("/admin/high-volume");
}
