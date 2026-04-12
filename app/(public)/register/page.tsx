import { RegisterPostForm } from "@/components/auth/RegisterPostForm";
import { config } from "@/lib/config";

export const metadata = {
  title: "Create account",
  description: `Create a ${config.brandName} account to submit evaluations, referrals, and tax filing requests.`,
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: { error?: string; ref?: string };
}) {
  const error = searchParams?.error;
  const referralFromLink = String(searchParams?.ref || "")
    .trim()
    .toUpperCase();

  const msg =
    error === "invalid"
      ? "Please complete all required fields. Password must be at least 8 characters and both passwords must match."
      : error === "server"
      ? "Something went wrong. Please try again."
      : null;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0" }}>
      <h1>Create Account</h1>
      <p style={{ color: "#475569", lineHeight: 1.7 }}>
        Registration is required to secure your submissions, issue and track referral links, and keep 1701A evaluations properly attributed.
      </p>

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

      <RegisterPostForm defaultRef={referralFromLink} />

      <p style={{ marginTop: 14, color: "#475569" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </main>
  );
}