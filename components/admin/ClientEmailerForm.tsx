"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ERR_MAP: Record<string, string> = {
  unauthorized: "You are not signed in as admin.",
  invalid: "Please enter a valid recipient email, subject, and email content.",
  send_failed:
    "SMTP send failed. Check Vercel logs and SMTP settings. If the API returned OK, check spam or promotions.",
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
  const [devLogOnly, setDevLogOnly] = useState(false);

  const canSubmit = Boolean(email.trim() && subject.trim() && body.trim());

  async function request(kind: "preview" | "send") {
    setErr(null);
    setSentTo(null);
    setDevLogOnly(false);
    setPending(kind);
    if (kind === "preview") {
      setPreviewHtml(null);
      setPreviewSubject(null);
    }
    try {
      const res = await fetch(`/api/admin/client-emailer/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
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
        devLogOnly?: boolean;
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
      setDevLogOnly(Boolean(json.devLogOnly));
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="checkoutGrid" style={{ marginTop: 22, gridTemplateColumns: "1fr", maxWidth: 760 }}>
      <div className="checkoutBox">
        <h2>Custom client email</h2>

        <div className="form" style={{ marginTop: 4 }}>
          <label>
            <strong>Client email</strong>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            <strong>Subject</strong>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              maxLength={200}
            />
          </label>

          <label>
            <strong>Email content</strong>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={11}
              placeholder="Type your message. Blank lines become separate paragraphs."
            />
          </label>

          <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
            Your text is wrapped in the standard FileRight email layout and legal footer, same as billing emails.
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
        </div>

        {err ? (
          <div
            className="notice"
            style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
          >
            <strong>Client emailer</strong>
            <p style={{ margin: "8px 0 0" }}>{err}</p>
          </div>
        ) : null}

        {devLogOnly ? (
          <div
            className="notice"
            style={{ marginTop: 14, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" }}
          >
            <strong>Development mode</strong>
            <p style={{ margin: "8px 0 0" }}>
              SMTP is not configured on this environment, so the message was only logged on the server and was not
              delivered.
            </p>
          </div>
        ) : null}

        {sentTo && !devLogOnly ? (
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
              Queued for <b>{sentTo}</b>. Delivery is usually immediate; ask the recipient to check spam or promotions if
              it does not arrive.
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
              title="Custom client email preview"
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
