import { AgentLoginForm } from "@/components/agent/AgentLoginForm";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function AgentLoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const reg = searchParams?.registered === "1";
  const linked = searchParams?.linked === "1";
  const agentAccount = searchParams?.error === "agent_account";
  const banner = agentAccount
    ? "This email is an external agent account. Please sign in on this page instead of the customer login."
    : reg && linked
      ? "Agent portal enabled on your existing FileRight account. Sign in below with the same email and password you use as a client."
      : linked
        ? "You can sign in below with your FileRight email and password."
        : reg
          ? "Account created. You may sign in below."
          : null;

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 16px" }}>
      <AgentLoginForm errorBanner={banner} />
    </main>
  );
}
