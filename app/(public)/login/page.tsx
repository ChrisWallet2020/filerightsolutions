import { LoginPostForm } from "@/components/auth/LoginPostForm";
import { config } from "@/lib/config";
import { safePostLoginPath } from "@/lib/postLoginRedirect";

/** Must be dynamic or `next` is often missing (stale shell / caching). */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  description: `Sign in to your ${config.brandName} account for evaluations, billing, and tax filing assistance.`,
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === "string" ? v : v[0];
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string | string[] };
}) {
  const error = firstString(searchParams?.error);
  const nextRaw = firstString(searchParams?.next);
  const next = nextRaw ? safePostLoginPath(nextRaw) : null;

  const msg =
    error === "invalid"
      ? "Incorrect email or password."
      : error === "exists"
      ? "That email is already registered. Please sign in."
      : error === "server"
      ? "Something went wrong. Please try again."
      : null;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0" }}>
      <h1>Sign In</h1>

      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {msg}
        </div>
      )}

      <LoginPostForm nextPath={next} submitLabel="Sign In" />

      <p style={{ marginTop: 14, color: "#475569" }}>
        No account yet? <a href="/register">Create one</a>
      </p>
    </main>
  );
}
