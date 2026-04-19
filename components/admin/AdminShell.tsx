"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavItem = { href: string; label: string };

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/evaluation-limits", label: "Evaluation limits" },
  { href: "/admin/high-volume", label: "Submission controls" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/filing-queue", label: "Filing queue" },
  { href: "/admin/client-emailer", label: "Client emailer" },
  { href: "/admin/agents", label: "Agents" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="adminShell">
      <aside className="adminNav">
        <div className="adminTitleWrap">
          <div className="adminTitle">Admin Workspace</div>
          <div className="adminSubTitle">Operations and communications</div>
        </div>
        <nav className="adminTabNav" aria-label="Admin sections">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`adminTabLink ${isActive(item.href) ? "isActive" : ""}`}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/admin/logout" method="post">
          <button className="linkBtn adminLogoutBtn" type="submit">
            Logout
          </button>
        </form>
      </aside>
      <div className="adminMain">{children}</div>
    </div>
  );
}