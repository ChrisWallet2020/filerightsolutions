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
        credentials: "same-origin",
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
        credentials: "same-origin",
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
    <div className="checkoutGrid" style={{ marginTop: 22, gridTemplateColumns: "1fr", maxWidth: 760 }}>
      <div className="checkoutBox">
        <h2>Filing confirmation email</h2>

        <div className="form" style={{ marginTop: 4 }}>
          <label>
            <strong>Client name</strong>
            <AdminClientEmailCombobox
              options={options}
              value={email}
              onChange={setEmail}
              variant="name"
              placeholder="Search by name…"
            />
          </label>

          {lastSentAt ? (
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
              Last sent filing email: <strong style={{ color: "var(--fg)" }}>{new Date(lastSentAt).toLocaleString()}</strong>
            </p>
          ) : null}

          <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
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
        </div>

        {err ? (
          <div
            className="notice"
            style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
          >
            <strong>Filing email</strong>
            <p style={{ margin: "8px 0 0" }}>{err}</p>
          </div>
        ) : null}

        {sent ? (
          <div
            className="notice"
            style={{
              marginTop: 14,
              borderColor: "#86efac",
              background: "#f0fdf4",
              color: "#14532d",
            }}
          >
            <strong>Message sent</strong>
            <p style={{ margin: "8px 0 0" }}>
              Queued for <b>{email.trim()}</b>. If the recipient does not see it, suggest spam or promotions.
            </p>
          </div>
        ) : null}

        {previewSubject ? (
          <p className="muted" style={{ margin: "16px 0 0" }}>
            Subject: <strong style={{ color: "var(--fg)" }}>{previewSubject}</strong>
          </p>
        ) : null}

        {previewHtml ? (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, color: "var(--fg)" }}>Preview</h3>
            <p className="muted" style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5 }}>
              Nothing was sent. Scroll inside the frame to see the full message.
            </p>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={previewHtml}
              style={{
                width: "100%",
                minHeight: 720,
                border: "1px solid var(--line)",
                borderRadius: 12,
                background: "#fff",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
