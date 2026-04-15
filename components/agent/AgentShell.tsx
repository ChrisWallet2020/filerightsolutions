import Link from "next/link";
import { AgentLogoutButton } from "@/components/agent/AgentLogoutButton";

export function AgentShell({
  agentName,
  children,
}: {
  agentName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="agentLayout">
      <aside className="agentSide">
        <div>
          <div className="agentSideTitle">Agent portal</div>
          <div className="agentBrand">FileRight Solutions</div>
        </div>
        <div className="agentSideMeta">
          Signed in as
          <br />
          <strong style={{ color: "#fff" }}>{agentName}</strong>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <Link href="/agent-dashboard" style={{ color: "#e2e8f0", fontWeight: 600, textDecoration: "none" }}>
            Dashboard
          </Link>
        </nav>
        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <AgentLogoutButton />
        </div>
      </aside>
      <div className="agentMain">{children}</div>
    </div>
  );
}
