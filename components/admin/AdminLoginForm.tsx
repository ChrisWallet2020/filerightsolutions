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
  const identifierPlaceholder = identifierType === "email" ? "Enter email" : "Enter username";
  return (
    <form action={action} method="post" className="form" style={{ maxWidth: 420 }}>
      <label>
        {identifierLabel}
        <input
          name={identifierName}
          type={identifierType}
          required
          placeholder={identifierPlaceholder}
          autoComplete="off"
        />
      </label>
      <label>
        Password
        <input name="password" type="password" required placeholder="Enter password" autoComplete="off" />
      </label>
      <SubmitButton className="btn wFull" pendingLabel="Signing in…">
        Login
      </SubmitButton>
    </form>
  );
}
