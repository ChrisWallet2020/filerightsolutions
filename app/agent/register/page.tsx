import { AgentRegisterForm } from "@/components/agent/AgentRegisterForm";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function AgentRegisterPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 16px" }}>
      <AgentRegisterForm />
    </main>
  );
}
