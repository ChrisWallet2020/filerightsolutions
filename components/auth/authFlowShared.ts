import type { CSSProperties } from "react";

export const authMain: CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "48px 0 56px",
};

export const authTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 28,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#0f172a",
};

export const authLead: CSSProperties = {
  margin: "0 0 24px",
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.6,
};

export const authCard: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: "28px 24px",
  background: "#fff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};

export const authFormGrid: CSSProperties = {
  display: "grid",
  gap: 16,
};

export const authLabel: CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: "#334155",
};

/** Muted helper under a field label */
export const authFieldHint: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.45,
  fontWeight: 400,
};

export const authInput: CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 16,
  boxSizing: "border-box",
  outline: "none",
};

export const authButtonFull: CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  cursor: "pointer",
  background: "#1e40af",
  color: "#fff",
};

export const authNoticeOk: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
  fontSize: 15,
  lineHeight: 1.65,
};

export const authNoticeErr: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
  fontSize: 14,
  lineHeight: 1.5,
};

export const authFooterLinks: CSSProperties = {
  marginTop: 20,
  fontSize: 14,
  color: "#64748b",
  lineHeight: 1.6,
};

export const authLink: CSSProperties = {
  color: "#1e40af",
  fontWeight: 700,
  textDecoration: "none",
};
