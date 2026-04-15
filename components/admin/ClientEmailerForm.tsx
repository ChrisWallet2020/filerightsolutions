"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ERR_MAP: Record<string, string> = {
  unauthorized: "You are not signed in as admin.",
  invalid: "Please enter a valid recipient email, subject, and email content.",
  send_failed:
    "Email send failed. Check Vercel logs and Graph mail configuration. If the API returned OK, check spam or promotions.",
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
    <div className="adminStack" style={{ maxWidth: 760 }}>
      <div className="adminCard">
        <h2>Custom client email</h2>

        <div className="form">
          <label className="adminLabel">
            <strong>Client email</strong>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoComplete="email"
            />
          </label>

          <label className="adminLabel">
            <strong>Subject</strong>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              maxLength={200}
            />
          </label>

          <label className="adminLabel">
            <strong>Email content</strong>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={11}
              placeholder="Type your message. Blank lines become separate paragraphs."
            />
          </label>

          <p className="muted adminBodyText">
            Your text is wrapped in the standard FileRight email layout and legal footer, same as billing emails.
          </p>

          <div className="adminActions">
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
          <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Client emailer</strong>
            <p className="adminNoticeBody">{err}</p>
          </div>
        ) : null}

        {devLogOnly ? (
          <div className="adminNotice adminNotice--warn" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Development mode</strong>
            <p className="adminNoticeBody">
              Graph mail is not configured on this environment, so the message was only logged on the server and was not
              delivered.
            </p>
          </div>
        ) : null}

        {sentTo && !devLogOnly ? (
          <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Message sent</strong>
            <p className="adminNoticeBody">
              Queued for <b>{sentTo}</b>. Delivery is usually immediate; ask the recipient to check spam or promotions if
              it does not arrive.
            </p>
          </div>
        ) : null}

        {previewSubject ? (
          <p className="muted adminBodyText" style={{ marginTop: 16 }}>
            Subject: <strong style={{ color: "var(--fg)" }}>{previewSubject}</strong>
          </p>
        ) : null}

        {previewHtml ? (
          <div className="adminPreviewWrap">
            <h3 className="adminPreviewTitle">Preview</h3>
            <p className="muted adminPreviewHint">
              Nothing was sent. Scroll inside the frame to see the full message.
            </p>
            <iframe
              title="Custom client email preview"
              sandbox=""
              srcDoc={previewHtml}
              className="adminPreviewFrame"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
