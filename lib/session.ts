export const ADMIN_SESSION_COOKIE = "tax_site_admin";
export const PROCESSOR1_SESSION_COOKIE = "tax_site_processor1";
export const PROCESSOR2_SESSION_COOKIE = "tax_site_processor2";
export const USER_SESSION_COOKIE = "tax_site_user";
export const AGENT_SESSION_COOKIE = "tax_site_agent";

export type SignedSession = { payload: string; signature: string };

export function parseSignedSession(value: string): SignedSession | null {
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = value.slice(0, i);
  const signature = value.slice(i + 1);
  if (!payload || !signature) return null;
  return { payload, signature };
}
