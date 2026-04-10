"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 6,
  boxSizing: "border-box",
};

const linkStyle: CSSProperties = {
  color: "#1e40af",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};

const btnBlue: CSSProperties = {
  background: "#1e40af",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const btnDark: CSSProperties = {
  background: "#0f172a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

export function LoginPostForm({
  nextPath,
  variant = "blue",
  showForgot = true,
  formStyle,
  submitLabel,
  pendingLabel = "Signing in…",
}: {
  nextPath?: string | null;
  variant?: "blue" | "dark";
  showForgot?: boolean;
  formStyle?: CSSProperties;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const buttonStyle = variant === "dark" ? btnDark : btnBlue;
  const defaultForm: CSSProperties = { marginTop: 18, display: "grid", gap: 12 };

  return (
    <form method="post" action="/api/auth/login" style={formStyle ?? defaultForm}>
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <label style={{ fontSize: 14, color: "#334155" }}>
        Email
        <input name="email" type="email" required style={inputStyle} autoComplete="email" />
      </label>
      <label style={{ fontSize: 14, color: "#334155" }}>
        Password
        <input name="password" type="password" required style={inputStyle} autoComplete="current-password" />
      </label>
      {showForgot ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
          <Link href="/forgot-password" style={linkStyle}>
            Forgot password?
          </Link>
        </div>
      ) : null}
      <SubmitButton style={buttonStyle} pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
