import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthedUserId } from "@/lib/auth";

/** Evaluation and other account sub-routes that require a session. `/account/payment` stays outside this group. */
export default function AccountAuthedLayout({ children }: { children: ReactNode }) {
  if (!getAuthedUserId()) redirect("/login");
  return <>{children}</>;
}
