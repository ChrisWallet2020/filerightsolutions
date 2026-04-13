"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ERR_MAP: Record<string, string> = {
  unauthorized: "You are not signed in as admin.",
  invalid: "Please enter a valid recipient email, subject, and email content.",
  send_failed: "SMTP send failed. Check SMTP settings and server logs.",
};

type PendingState = "preview" | "send" | null;

export function ClientEmailerForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingState>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const canSubmit = Boolean(email.trim() && subject.trim() && body.trim());

  async function request(kind: "preview" | "send") {
    setErr(null);
    setSentTo(null);
    setPending(kind);
    if (kind === "preview") {
      setPreviewHtml(null);
      setPreviewSubject(null);
    }
    try {
      const res = await fetch(`/api/admin/client-emailer/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          subject: subject.trim(),
          body,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        subject?: string;
        html?: string;
        to?: string;
      };
      if (!res.ok) {
        setErr(ERR_MAP[json.error || ""] || `Request failed (${res.status}).`);
        return;
      }
      if (kind === "preview") {
        setPreviewSubject(json.subject ?? null);
        setPreviewHtml(json.html ?? null);
        return;
      }
      setSentTo(json.to ?? email.trim());
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ marginTop: 18, display: "grid", gap: 16, maxWidth: 900 }}>
      <label style={{ display: "grid", gap: 6, color: "#0f172a" }}>
        <strong>Client Email</strong>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@example.com"
          style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12 }}
        />
      </label>

      <label style={{ display: "grid", gap: 6, color: "#0f172a" }}>
        <strong>Subject</strong>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Type email subject"
          maxLength={200}
          style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12 }}
        />
      </label>

      <label style={{ display: "grid", gap: 6, color: "#0f172a" }}>
        <strong>Email Content</strong>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={11}
          placeholder="Type your custom message here…"
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        />
      </label>

      <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
        The content above is wrapped in the standard FileRight email format and footer used by existing emails.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="btn btnSecondary"
          disabled={pending !== null || !canSubmit}
          onClick={() => void request("preview")}
        >
          {pending === "preview" ? "Loading preview…" : "Preview email"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending !== null || !canSubmit}
          onClick={() => void request("send")}
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

      {sentTo ? (
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
          Message sent to <b>{sentTo}</b>.
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
            title="Custom client email preview"
            sandbox=""
            srcDoc={previewHtml}
            style={{
              width: "100%",
              minHeight: 480,
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
