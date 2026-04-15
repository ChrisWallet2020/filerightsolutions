import Link from "next/link";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="adminShell">
      <aside className="adminNav">
        <div className="adminTitle">Admin</div>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/evaluations">Evaluations</Link>
        <Link href="/admin/evaluation-limits">Evaluation Limits</Link>
        <Link href="/admin/high-volume">Submission Controls</Link>
        <Link href="/admin/billing">Billing</Link>
        <Link href="/admin/filing-complete-email">Filing email</Link>
        <Link href="/admin/client-emailer">Client emailer</Link>
        <Link href="/admin/agents">Agents</Link>
        <form action="/api/admin/logout" method="post">
          <button className="linkBtn" type="submit">Logout</button>
        </form>
      </aside>
      <div className="adminMain">{children}</div>
    </div>
  );
}