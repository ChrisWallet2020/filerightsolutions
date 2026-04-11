import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { authCard, authLead, authMain, authTitle } from "@/components/auth/authFlowShared";

function ResetPasswordFallback() {
  return (
    <main style={authMain}>
      <h1 style={authTitle}>Reset password</h1>
      <p style={authLead}>Loading…</p>
      <div style={{ ...authCard, minHeight: 120, opacity: 0.85 }} aria-hidden />
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
