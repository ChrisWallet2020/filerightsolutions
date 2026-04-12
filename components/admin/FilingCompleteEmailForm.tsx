"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminClientEmailCombobox, type AdminClientEmailOption } from "@/components/admin/AdminClientEmailCombobox";
import type { FilingCompleteNotifyClientRow } from "@/lib/admin/filingCompleteNotifyClients";

const NOT_ELIGIBLE =
  "Only clients who have paid and submitted a 1701A evaluation can receive this message. Pick a name from the list or resolve a full match.";

export function FilingCompleteEmailForm({ clients }: { clients: FilingCompleteNotifyClientRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<"preview" | "send" | null>(null);
  const [sent, setSent] = useState(false);

  const options: AdminClientEmailOption[] = clients;

  const selected = useMemo(
    () =>
      options.find(
        (c) => email.trim() && c.email.toLowerCase() === email.trim().toLowerCase()
      ) ?? null,
    [options, email]
  );

  const lastSentAt = selected?.lastFilingNotifySentAt ?? null;

  async function preview() {
    setErr(null);
    setSent(false);
    setPending("preview");
    try {
      const res = await fetch("/api/admin/filing-complete-email/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreviewHtml(null);
        setPreviewSubject(null);
        setErr(
          j.error === "not_eligible" || j.error === "not_submitted"
            ? NOT_ELIGIBLE
            : "Preview failed. Check the address and try again."
        );
        return;
      }
      setPreviewHtml(j.html as string);
      setPreviewSubject((j.subject as string) ?? null);
    } finally {
      setPending(null);
    }
  }

  async function send() {
    setErr(null);
    setPending("send");
    try {
      const res = await fetch("/api/admin/filing-complete-email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          j.error === "not_eligible" || j.error === "not_submitted"
            ? NOT_ELIGIBLE
            : j.error === "send_failed"
              ? "SMTP send failed. Check server logs and SMTP configuration."
              : "Send failed."
        );
        setSent(false);
        return;
      }
      setSent(true);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ marginTop: 18, display: "grid", gap: 16, maxWidth: 900 }}>
      <label style={{ display: "grid", gap: 6, color: "#0f172a" }}>
        <strong>Client Name</strong>
        <AdminClientEmailCombobox
          options={options}
          value={email}
          onChange={setEmail}
          variant="name"
          placeholder="Search by name…"
        />
      </label>

      {lastSentAt ? (
        <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
          Last sent filing email:{" "}
          <strong style={{ color: "#0f172a" }}>{new Date(lastSentAt).toLocaleString()}</strong>
        </p>
      ) : null}

      <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
        Only clients who have <b>paid</b> and <b>submitted</b> a 1701A evaluation appear here. The message is sent to
        their sign-in email.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="btn btnSecondary"
          disabled={pending !== null || !email.trim()}
          onClick={() => void preview()}
        >
          {pending === "preview" ? "Loading preview…" : "Preview email"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending !== null || !email.trim()}
          onClick={() => void send()}
        >
          {pending === "send" ? "Sending…" : "Send email"}
        </button>
      </div>

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {err}
        </div>
      ) : null}

      {sent ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: 14,
          }}
        >
          Message sent to <b>{email.trim()}</b>.
        </div>
      ) : null}

      {previewSubject ? (
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
          Subject: <b style={{ color: "#0f172a" }}>{previewSubject}</b>
        </p>
      ) : null}

      {previewHtml ? (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#0f172a" }}>Preview</div>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={previewHtml}
            style={{
              width: "100%",
              minHeight: 420,
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fff",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
