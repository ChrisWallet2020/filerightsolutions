"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ERR_MAP: Record<string, string> = {
  unauthorized: "You are not signed in as admin.",
  invalid: "Please enter a valid recipient email, subject, and email content.",
  send_failed:
    "Email send failed. Check Vercel logs and Resend configuration. If the API returned OK, check spam or promotions.",
};

type PendingState = "preview" | "send" | null;
type ReminderJobState = {
  id: string;
  status: "idle" | "queued" | "running" | "done" | "error";
  total: number;
  processed: number;
  sent: number;
  failed: number;
  skippedPaid: number;
  lastError: string;
};

type SchedulerState = {
  activeJobType: "quotes_send_all" | "reminders_send_all" | null;
  queue: ("quotes_send_all" | "reminders_send_all")[];
};

export function ClientEmailerForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingState>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reminderErr, setReminderErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devLogOnly, setDevLogOnly] = useState(false);
  const [reminderJob, setReminderJob] = useState<ReminderJobState | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerState | null>(null);

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

  async function sendAllReminderEmails() {
    setReminderErr(null);
    setSendingReminders(true);
    try {
      const res = await fetch("/api/admin/client-emailer/send-reminder-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        queued?: boolean;
        started?: boolean;
        job?: ReminderJobState;
        scheduler?: SchedulerState;
      };
      if (!res.ok || !json.job) {
        setReminderErr(ERR_MAP[json.error || ""] || `Request failed (${res.status}).`);
        return;
      }
      setReminderJob(json.job);
      setScheduler(json.scheduler ?? null);
      router.refresh();
    } finally {
      setSendingReminders(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/client-emailer/send-reminder-all/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          job?: ReminderJobState;
          scheduler?: SchedulerState;
        };
        if (cancelled || !res.ok || !json.job) return;
        setReminderJob(json.job);
        setScheduler(json.scheduler ?? null);
      } catch {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const shouldPoll = reminderJob?.status === "queued" || reminderJob?.status === "running";
    if (!shouldPoll) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch("/api/admin/client-emailer/send-reminder-all/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          job?: ReminderJobState;
          scheduler?: SchedulerState;
        };
        if (cancelled || !res.ok || !json.job) return;
        setReminderJob(json.job);
        setScheduler(json.scheduler ?? null);
      } catch {
        // keep last known state
      }
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [reminderJob?.status]);

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
              Resend is not configured on this environment, so the message was only logged on the server and was not
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

      <div className="adminCard">
        <h2>Reminder email</h2>
        <p className="muted adminBodyText" style={{ marginBottom: 12 }}>
          Sends the <strong>BIR 1701A deadline reminder</strong> template to registered client accounts that have not yet
          paid for services.
        </p>

        <div className="adminActions">
          <button
            type="button"
            className="btn"
            disabled={sendingReminders}
            onClick={() => void sendAllReminderEmails()}
          >
            {sendingReminders ? "Sending reminders…" : "Send all reminder emails"}
          </button>
        </div>

        {reminderErr ? (
          <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Reminder email</strong>
            <p className="adminNoticeBody">{reminderErr}</p>
          </div>
        ) : null}

        {reminderJob?.status === "done" ? (
          <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Reminder batch finished</strong>
            <p className="adminNoticeBody">
              Processed: <b>{reminderJob.processed}</b> / <b>{reminderJob.total}</b>, sent: <b>{reminderJob.sent}</b>,
              failed: <b>{reminderJob.failed}</b>, skipped paid clients: <b>{reminderJob.skippedPaid}</b>.
            </p>
          </div>
        ) : null}
        {reminderJob && (reminderJob.status === "queued" || reminderJob.status === "running") ? (
          <div className="adminNotice adminNotice--warn" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">
              {reminderJob.status === "queued" ? "Reminder batch queued" : "Reminder batch running"}
            </strong>
            <p className="adminNoticeBody">
              {reminderJob.status === "queued"
                ? "This batch will start after higher-priority email jobs finish."
                : "Sending is in progress."}{" "}
              Progress: <b>{reminderJob.processed}</b> / <b>{reminderJob.total}</b>.
              {scheduler?.activeJobType === "quotes_send_all" ? " Waiting for quote send-all to finish." : ""}
            </p>
          </div>
        ) : null}
        {reminderJob?.status === "error" ? (
          <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
            <strong className="adminNoticeTitle">Reminder batch failed</strong>
            <p className="adminNoticeBody">{reminderJob.lastError || "Unexpected error while running reminder batch."}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
