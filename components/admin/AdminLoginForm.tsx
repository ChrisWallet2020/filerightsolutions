"use client";

import { SubmitButton } from "@/components/ui/SubmitButton";

export function AdminLoginForm() {
  return (
    <form action="/api/admin/login" method="post" className="form" style={{ maxWidth: 420 }}>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <SubmitButton className="btn wFull" pendingLabel="Signing in…">
        Login
      </SubmitButton>
    </form>
  );
}
