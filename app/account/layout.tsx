import { redirect } from "next/navigation";
import { getAuthedUserId } from "@/lib/auth";

export default function AccountBranchLayout({ children }: { children: React.ReactNode }) {
  if (!getAuthedUserId()) redirect("/login");
  return <>{children}</>;
}
