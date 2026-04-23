"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/processor2_dashboard/evaluations", label: "Evaluations" },
  { href: "/processor2_dashboard/quote", label: "Quote" },
  { href: "/processor2_dashboard/filing-complete-email", label: "Filing email" },
  { href: "/processor2_dashboard/income-tracker", label: "Income tracker" },
  { href: "/processor2_dashboard/tools", label: "Tools" },
];

export function Processor2Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isLoginPage =
    pathname === "/processor2_dashboard/login" || pathname === "/processor2_dashboard/login/";

  return (
    <div className={`adminShell${isLoginPage ? " adminShell--processorLogin" : ""}`}>
      {!isLoginPage ? (
      <aside className="adminNav">
        <div className="adminTitleWrap">
          <div className="adminTitle">Processor2 Workspace</div>
          <div className="adminSubTitle">Evaluations and filing notices</div>
        </div>
        <nav className="adminTabNav" aria-label="Processor2 sections">
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
        <form action="/api/processor2/logout" method="post">
          <button className="linkBtn adminLogoutBtn" type="submit">
            Logout
          </button>
        </form>
      </aside>
      ) : null}
      <div className={`adminMain${isLoginPage ? " adminMain--processorLogin" : ""}`}>{children}</div>
    </div>
  );
}
