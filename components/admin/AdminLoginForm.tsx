"use client";

import { SubmitButton } from "@/components/ui/SubmitButton";

export type AdminLoginFormProps = {
  /** Form POST target (e.g. `/api/admin/login`, `/api/processor1/login`). */
  action?: string;
  /** First field label (admin: Email; processors: Username). */
  identifierLabel?: string;
  /** First field `name` attribute (admin: `email`; processors: `username`). */
  identifierName?: string;
  /** First field input type. */
  identifierType?: "email" | "text";
};

export function AdminLoginForm({
  action = "/api/admin/login",
  identifierLabel = "Email",
  identifierName = "email",
  identifierType = "email",
}: AdminLoginFormProps) {
  return (
    <form action={action} method="post" className="form" style={{ maxWidth: 420 }}>
      <label>
        {identifierLabel}
        <input
          name={identifierName}
          type={identifierType}
          required
          autoComplete={identifierType === "email" ? "email" : "username"}
        />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <SubmitButton className="btn wFull" pendingLabel="Signing in…">
        Login
      </SubmitButton>
    </form>
  );
}
