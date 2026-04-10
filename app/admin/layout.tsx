import { AdminShell } from "@/components/admin/AdminShell";

/** No nested <html>: root layout supplies document + favicon; duplicate html hid tab icons on admin. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}