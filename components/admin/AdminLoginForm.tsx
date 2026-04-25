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
    <form action={action} method="post" autoComplete="off" className="form" style={{ maxWidth: 420 }}>
      <input type="text" name="decoy_username" autoComplete="username" tabIndex={-1} style={{ display: "none" }} />
      <input
        type="password"
        name="decoy_password"
        autoComplete="current-password"
        tabIndex={-1}
        style={{ display: "none" }}
      />
      <label>
        {identifierLabel}
        <input
          name={identifierName}
          type={identifierType}
          required
          placeholder={identifierPlaceholder}
          autoComplete="new-password"
          data-lpignore="true"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          required
          placeholder="Enter password"
          autoComplete="new-password"
          data-lpignore="true"
        />
      </label>
      <SubmitButton className="btn wFull" pendingLabel="Signing in…">
        Login
      </SubmitButton>
    </form>
  );
}
