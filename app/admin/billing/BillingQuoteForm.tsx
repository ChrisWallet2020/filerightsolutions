"use client";

import { useRef, useState } from "react";

const PREVIEW_ERR: Record<string, string> = {
  user_not_found: "Preview failed: no registered account matches the client email.",
  invalid_form: "Preview failed: please check required fields and try again.",
  attachment_type: "Preview failed: billing images must be image files (JPEG, PNG, etc.).",
  attachment_size: "Preview failed: each image must be 10MB or smaller.",
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
          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Billing images (optional, up to 3)</span>
            <label style={{ fontSize: 14, color: "#475569" }}>
              Image 1
              <input name="billingAttachment1" type="file" accept="image/*" style={{ marginTop: 6, display: "block" }} />
            </label>
            <label style={{ fontSize: 14, color: "#475569" }}>
              Image 2
              <input name="billingAttachment2" type="file" accept="image/*" style={{ marginTop: 6, display: "block" }} />
            </label>
            <label style={{ fontSize: 14, color: "#475569" }}>
              Image 3
              <input name="billingAttachment3" type="file" accept="image/*" style={{ marginTop: 6, display: "block" }} />
            </label>
          </div>
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
