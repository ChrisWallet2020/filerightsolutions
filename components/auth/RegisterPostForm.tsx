"use client";

import type { CSSProperties } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 6,
};

const btnPrimary: CSSProperties = {
  background: "#1e40af",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

export function RegisterPostForm({ defaultRef }: { defaultRef: string }) {
  return (
    <form method="post" action="/api/auth/register" style={{ marginTop: 18, display: "grid", gap: 12 }}>
      <label style={{ fontSize: 14, color: "#334155" }}>
        Full Name
        <input name="fullName" required style={inputStyle} />
      </label>
      <label style={{ fontSize: 14, color: "#334155" }}>
        Email
        <input name="email" type="email" required style={inputStyle} />
      </label>
      <label style={{ fontSize: 14, color: "#334155" }}>
        Password
        <input name="password" type="password" required minLength={8} style={inputStyle} />
      </label>
      <label style={{ fontSize: 14, color: "#334155" }}>
        Re-enter Password
        <input name="password2" type="password" required minLength={8} style={inputStyle} />
      </label>
      <label style={{ fontSize: 14, color: "#334155" }}>
        Referral Code (optional)
        <input name="ref" placeholder="If someone referred you" defaultValue={defaultRef} style={inputStyle} />
      </label>
      <SubmitButton style={btnPrimary} pendingLabel="Creating account…">
        Create Account
      </SubmitButton>
    </form>
  );
}
