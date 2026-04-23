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
  const [sendStatus, setSendStatus] = useState<"sent" | "failed" | null>(null);
  const [sendLastSentAt, setSendLastSentAt] = useState<string | null>(null);

  const options: AdminClientEmailOption[] = clients;

  const selected = useMemo(
    () =>
      options.find(
        (c) => email.trim() && c.email.toLowerCase() === email.trim().toLowerCase()
      ) ?? null,
    [options, email]
  );

  const lastSentAt = selected?.lastFilingNotifySentAt ?? null;

  function formatGmtPlus8(v: string): string {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(v));
  }

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
    setSendStatus(null);
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
              ? "Email send failed. Check server logs and Resend configuration."
              : "Send failed."
        );
        setSent(false);
        setSendStatus("failed");
        setSendLastSentAt(lastSentAt);
        return;
      }
      setSent(true);
      setSendStatus("sent");
      setSendLastSentAt(typeof j.lastSentAt === "string" ? j.lastSentAt : new Date().toISOString());
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="adminStack" style={{ maxWidth: 760 }}>
      <div className="adminCard">
        <h2>Filing confirmation email</h2>

        <div className="form">
          <label className="adminLabel">
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
            <p className="muted adminBodyText">
              Last sent (GMT+8): <strong style={{ color: "var(--fg)" }}>{formatGmtPlus8(lastSentAt)}</strong>
            </p>
          ) : null}

          <p className="muted adminBodyText">
            Only paid clients appear here. Sending this will notify them via their sign-in email that their tax filing has
            been completed. Once the client has been successfully notified, their email address will no longer be searchable
            here. If sending this email fails, the client&apos;s address remains searchable so you can try again.
          </p>

          <div className="adminActions">
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

          {sendStatus ? (
            <p className="muted" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4 }}>
              Last sent (GMT+8):{" "}
              <strong style={{ color: "var(--fg)" }}>
                {sendLastSentAt ? formatGmtPlus8(sendLastSentAt) : "—"}
              </strong>{" "}
              · {sendStatus === "sent" ? "Email sent" : "Sending failed"}
            </p>
          ) : null}
        </div>

        {err ? (
          <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Filing email</strong>
            <p className="adminNoticeBody">{err}</p>
          </div>
        ) : null}

        {sent ? (
          <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Message sent</strong>
            <p className="adminNoticeBody">
              Email sent to <b>{email.trim()}</b>. If the recipient does not see it, suggest spam or promotions.
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
              title="Email preview"
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
