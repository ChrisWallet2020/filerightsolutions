"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [{ href: "/processor1_dashboard/evaluations", label: "Evaluations" }];

export function Processor1Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="adminShell">
      <aside className="adminNav">
        <div className="adminTitleWrap">
          <div className="adminTitle">Processor1 Workspace</div>
          <div className="adminSubTitle">1701A submissions</div>
        </div>
        <nav className="adminTabNav" aria-label="Processor1 sections">
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
        <form action="/api/processor1/logout" method="post">
          <button className="linkBtn adminLogoutBtn" type="submit">
            Logout
          </button>
        </form>
      </aside>
      <div className="adminMain">{children}</div>
    </div>
  );
}
