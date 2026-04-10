"use client";

import { useRef, useState } from "react";

const PREVIEW_ERR: Record<string, string> = {
  user_not_found: "Preview failed: no registered account matches the client email.",
  invalid_form: "Preview failed: please check required fields and try again.",
  attachment_type: "Preview failed: billing attachment must be an image file.",
  attachment_size: "Preview failed: billing attachment is too large (max 10MB).",
};

export function BillingQuoteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  async function handlePreview() {
    setPreviewBanner(null);
    const form = formRef.current;
    if (!form) return;
    setPreviewing(true);
    try {
      const fd = new FormData(form);
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

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        URL.revokeObjectURL(url);
        setPreviewBanner("Pop-up blocked. Allow pop-ups for this site to see the preview.");
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch {
      setPreviewBanner("Preview failed. Check your connection and try again.");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="checkoutGrid" style={{ marginTop: 22, gridTemplateColumns: "1fr", maxWidth: 760 }}>
      <div className="checkoutBox">
        <h2>Create quote</h2>
        {previewBanner ? (
          <div
            className="notice"
            style={{ marginBottom: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
          >
            <strong>Billing preview</strong>
            <p style={{ margin: "8px 0 0" }}>{previewBanner}</p>
          </div>
        ) : null}
        <form
          ref={formRef}
          method="post"
          action="/api/admin/payment-quotes/send"
          className="form"
          encType="multipart/form-data"
        >
          <label>
            Client email (must match registered account)
            <input name="userEmail" type="email" required placeholder="client@example.com" />
          </label>
          <label>
            Service Fee (PHP)
            <input name="baseAmountPhp" type="number" min={1} step={1} required placeholder="3500" />
          </label>
          <label>
            Note to client (optional, shown on payment page)
            <textarea
              name="clientNote"
              rows={3}
              placeholder="e.g. 1701A amendment — as discussed"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}
            />
          </label>
          <label>
            Internal memo (optional, not shown to client)
            <textarea
              name="adminMemo"
              rows={2}
              placeholder="For your records only"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}
            />
          </label>
          <label>
            Expires in days (optional)
            <input name="expiresInDays" type="number" min={1} max={365} placeholder="Leave blank for no expiry" />
          </label>
          <label>
            Billing attachment image
            <input name="billingAttachment" type="file" accept="image/*" />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="btn btnSecondary" disabled={previewing} onClick={handlePreview}>
              {previewing ? "Opening preview…" : "Preview billing email"}
            </button>
            <button type="submit" className="btn">
              Send billing email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
