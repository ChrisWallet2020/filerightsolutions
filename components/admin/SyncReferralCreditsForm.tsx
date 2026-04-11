"use client";

import { SubmitButton } from "@/components/ui/SubmitButton";

export function SyncReferralCreditsForm() {
  return (
    <form action="/api/admin/sync-referral-credits" method="post" style={{ marginTop: 12 }}>
      <SubmitButton
        spinnerOnLightBg
        pendingLabel="Syncing…"
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          fontWeight: 700,
          cursor: "pointer",
          color: "#0f172a",
        }}
      >
        Fix referral credits
      </SubmitButton>
    </form>
  );
}
