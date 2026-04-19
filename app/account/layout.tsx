import type { ReactNode } from "react";

/**
 * Root account segment: no auth gate here so `/account/payment` and `/account/payment/notice` can show inline sign-in.
 * Protected routes live under `(authed)/`.
 */
export default function AccountBranchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
