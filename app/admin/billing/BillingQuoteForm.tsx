"use client";

import { useRef, useState, type FormEvent } from "react";
import { AdminClientEmailCombobox, type AdminClientEmailOption } from "@/components/admin/AdminClientEmailCombobox";

const CLIENT_PICK_REQUIRED =
  "Choose a client from the list, or type their full name (or sign-in email) until it matches exactly.";

const PREVIEW_ERR: Record<string, string> = {
  user_not_found: "Preview failed: no registered account matches the client email.",
  evaluation_not_submitted:
    "Preview failed: billing is limited to clients who have already submitted their 1701A evaluation.",
  invalid_form: "Preview failed: please check required fields and try again.",
  attachment_type: "Preview failed: billing images must be image files (JPEG, PNG, etc.).",
  attachment_size: "Preview failed: each image must be 10MB or smaller.",
};

const SEND_ERR: Record<string, string> = {
  unauthorized: "You are not signed in as admin.",
  invalid: "Send failed: please check required fields and try again.",
  attachment_must_be_image: "Send failed: billing images must be image files (JPEG, PNG, etc.).",
  attachment_too_large_max_10mb: "Send failed: each image must be 10MB or smaller.",
};

export function BillingQuoteForm({ submittedClients }: { submittedClients: AdminClientEmailOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [sendBanner, setSendBanner] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  async function handlePreview() {
    setPreviewBanner(null);
    setPreviewHtml(null);
    const form = formRef.current;
    if (!form) return;
    setPreviewing(true);
    try {
      const fd = new FormData(form);
      if (!fd.get("userEmail")?.toString().trim()) {
        setPreviewBanner(CLIENT_PICK_REQUIRED);
        return;
      }
      const res = await fetch("/api/admin/payment-quotes/preview", {
        method: "POST",
        body: fd,
        credentials: "include",
        redirect: "manual",
      });

      if (res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
        const loc = res.headers.get("Location") || "";
        let code = "";
        try {
          code = new URL(loc, window.location.origin).searchParams.get("previewError") || "";
        } catch {
          code = "";
        }
        setPreviewBanner(PREVIEW_ERR[code] || "Preview failed. Please try again.");
        return;
      }

      if (res.status === 401) {
        setPreviewBanner("You are not signed in as admin.");
        return;
      }

      const html = await res.text();
      if (!res.ok) {
        setPreviewBanner("Preview failed. Please try again.");
        return;
      }

      setPreviewHtml(html);
    } catch {
      setPreviewBanner("Preview failed. Check your connection and try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSendBanner(null);
    const fd0 = new FormData(form);
    if (!fd0.get("userEmail")?.toString().trim()) {
      setSendBanner(CLIENT_PICK_REQUIRED);
      return;
    }
    setSending(true);
    let navigated = false;
    try {
      const res = await fetch(form.action || "/api/admin/payment-quotes/send", {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
        redirect: "follow",
      });
      if (res.ok) {
        navigated = true;
        window.location.assign(res.url);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const code = typeof data.error === "string" ? data.error : "request_failed";
      setSendBanner(SEND_ERR[code] || `Send failed (${res.status}). Try again.`);
    } catch {
      setSendBanner("Send failed: check your connection and try again.");
    } finally {
      if (!navigated) setSending(false);
    }
  }

  return (
    <div className="adminStack" style={{ maxWidth: 760 }}>
      <div className="adminCard">
        <h2>Create quote</h2>
        {previewBanner ? (
          <div className="adminNotice adminNotice--error" style={{ marginBottom: 14 }}>
            <strong className="adminNoticeTitle">Billing preview</strong>
            <p className="adminNoticeBody">{previewBanner}</p>
          </div>
        ) : null}
        {sendBanner ? (
          <div className="adminNotice adminNotice--error" style={{ marginBottom: 14 }}>
            <strong className="adminNoticeTitle">Send billing email</strong>
            <p className="adminNoticeBody">{sendBanner}</p>
          </div>
        ) : null}
        <form
          ref={formRef}
          method="post"
          action="/api/admin/payment-quotes/send"
          className="form"
          encType="multipart/form-data"
          onSubmit={(ev) => void handleSend(ev)}
        >
          <label className="adminLabel">
            <strong>Client Name</strong>
            <AdminClientEmailCombobox
              options={submittedClients}
              inputName="userEmail"
              required
              variant="name"
              placeholder="Search by name…"
            />
          </label>
          <label className="adminLabel">
            <strong>Service Fee (PhP)</strong>
            <input name="baseAmountPhp" type="number" min={1} step={1} required placeholder="3500" />
          </label>
          <label className="adminLabel">
            Note to client (optional, shown on payment page)
            <textarea
              name="clientNote"
              rows={3}
              placeholder="e.g. 1701A amendment — as discussed"
            />
          </label>
          <div className="adminFieldset">
            <p className="adminFieldsetTitle">Billing images (optional, up to 3)</p>
            <label className="muted adminLabel">
              Image 1
              <input name="billingAttachment1" type="file" accept="image/*" />
            </label>
            <label className="muted adminLabel">
              Image 2
              <input name="billingAttachment2" type="file" accept="image/*" />
            </label>
            <label className="muted adminLabel">
              Image 3
              <input name="billingAttachment3" type="file" accept="image/*" />
            </label>
          </div>
          <div className="adminActions">
            <button type="button" className="btn btnSecondary" disabled={previewing || sending} onClick={handlePreview}>
              {previewing ? "Loading preview…" : "Preview billing email"}
            </button>
            <button type="submit" className="btn" disabled={previewing || sending}>
              {sending ? "Sending..." : "Send billing email"}
            </button>
          </div>
        </form>

        {previewHtml ? (
          <div className="adminPreviewWrap" style={{ marginTop: 28 }}>
            <h3 className="adminPreviewTitle">Billing email preview</h3>
            <p className="muted adminPreviewHint">
              Nothing was sent. Scroll inside the frame to see the full message, images, and HTML rendering.
            </p>
            <iframe
              title="Billing email preview"
              srcDoc={previewHtml}
              className="adminPreviewFrame"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
