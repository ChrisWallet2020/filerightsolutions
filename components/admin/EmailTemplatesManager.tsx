"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClientEmailTemplateDef,
  ClientEmailTemplatePreview,
  TemplateKind,
} from "@/lib/admin/clientEmailTemplates";

type Props = {
  templates: ClientEmailTemplateDef[];
};

const VARIABLE_HINTS: Record<TemplateKind, string> = {
  PASSWORD_RESET: "{{resetUrl}}, {{supportEmail}}",
  REGISTER_WELCOME: "{{fullName}}, {{siteName}}, {{loginUrl}}, {{supportEmail}}",
  BILLING_QUOTE: "{{clientFullName}}, {{payUrl}}, {{clientNote}}, {{expiresDate}}",
  FILING_COMPLETE_NOTIFY: "{{firstName}}, {{supportEmail}}, {{epayUrl}}",
  PAYMENT_RECEIVED_IN_PROGRESS: "{{clientName}}, {{publicOrderId}}",
  EVALUATION_NO_REDUCTION_UPDATE: "{{customerName}}",
  EVALUATION_PAYMENT_FOLLOWUP: "{{customerName}}, {{paymentUrl}}",
  BIR_1701A_DEADLINE_REMINDER: "{{clientName}}",
};

function TemplateKindPicker({
  value,
  options,
  onChange,
}: {
  value: TemplateKind;
  options: ClientEmailTemplateDef[];
  onChange: (next: TemplateKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((o) => o.kind === value)?.title ?? options[0]?.title ?? "";

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} style={{ position: "relative", maxWidth: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 160);
        }}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          fontSize: 14,
          boxSizing: "border-box",
          background: "#fff",
          color: "#0f172a",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          minWidth: 320,
        }}
      >
        <span>{selectedLabel}</span>
        <span aria-hidden style={{ marginLeft: 10, fontSize: 12, color: "#475569" }}>
          v
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.12)",
            zIndex: 50,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {options.map((tpl) => {
            const active = tpl.kind === value;
            return (
              <li key={tpl.kind} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(tpl.kind);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderRadius: 8,
                    background: active ? "#eff6ff" : "#fff",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 400,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = active ? "#eff6ff" : "#fff";
                  }}
                >
                  {tpl.title}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function EmailTemplatesManager({ templates }: Props) {
  const [items, setItems] = useState(templates);
  const [selectedKind, setSelectedKind] = useState<TemplateKind>(templates[0]?.kind ?? "BILLING_QUOTE");
  const [savingKind, setSavingKind] = useState<TemplateKind | null>(null);
  const [editingKind, setEditingKind] = useState<TemplateKind | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [preview, setPreview] = useState<ClientEmailTemplatePreview | null>(null);
  const [previewErr, setPreviewErr] = useState<string>("");
  const sorted = useMemo(() => [...items], [items]);
  const selected = useMemo(
    () => sorted.find((tpl) => tpl.kind === selectedKind) ?? sorted[0],
    [sorted, selectedKind],
  );

  async function saveOne(kind: TemplateKind) {
    const row = items.find((x) => x.kind === kind);
    if (!row) return;
    setSavingKind(kind);
    setMsg("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: row.kind,
          subject: row.subject,
          textBody: row.textBody,
        }),
      });
      if (!res.ok) {
        setMsg("Save failed. Please try again.");
        return;
      }
      setMsg(`Saved ${row.title}.`);
      setEditingKind(null);
    } catch {
      setMsg("Save failed. Check connection and try again.");
    } finally {
      setSavingKind(null);
    }
  }

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/email-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: selected.kind,
            subject: selected.subject,
            textBody: selected.textBody,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          preview?: ClientEmailTemplatePreview;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.preview) {
          setPreviewErr("Could not render preview.");
          return;
        }
        setPreviewErr("");
        setPreview(data.preview);
      } catch {
        if (!cancelled) setPreviewErr("Could not render preview.");
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [selected?.kind, selected?.subject, selected?.textBody]);

  return (
    <section className="section">
      <h1>Email Templates</h1>
      <p className="muted adminBodyText" style={{ marginBottom: 14 }}>
        Select a template, edit it, and review rendered result.
      </p>
      {msg ? (
        <div
          className="adminNotice adminNotice--success"
          style={{ marginBottom: 12, maxWidth: 1100, minHeight: 52, display: "flex", alignItems: "center" }}
        >
          <p className="adminNoticeBody" style={{ margin: 0 }}>
            {msg}
          </p>
        </div>
      ) : null}
      <div className="adminStack" style={{ maxWidth: 1100 }}>
        <div className="adminCard">
          <label className="adminLabel">
            <strong>Email template</strong>
            <TemplateKindPicker
              value={selected?.kind}
              options={sorted}
              onChange={setSelectedKind}
            />
          </label>

          {selected ? (
            <>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Variables: <code>{VARIABLE_HINTS[selected.kind]}</code>
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Formatting: <code>**bold**</code>, <code>_italic_</code>
              </div>
              <label className="adminLabel">
                <strong>Subject</strong>
                <input
                  value={selected.subject}
                  disabled={editingKind !== selected.kind}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) => (x.kind === selected.kind ? { ...x, subject: e.target.value } : x)),
                    )
                  }
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <label className="adminLabel">
                <strong>Body Text</strong>
                <textarea
                  rows={10}
                  value={selected.textBody}
                  disabled={editingKind !== selected.kind}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) => (x.kind === selected.kind ? { ...x, textBody: e.target.value } : x)),
                    )
                  }
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 14,
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: 200,
                  }}
                />
              </label>

              <div className="adminActions" style={{ marginTop: 14, marginBottom: 10 }}>
                {editingKind === selected.kind ? (
                  <>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => void saveOne(selected.kind)}
                      disabled={savingKind === selected.kind}
                    >
                      {savingKind === selected.kind ? "Saving..." : "Save template"}
                    </button>
                    <button
                      className="btn btnSecondary"
                      type="button"
                      onClick={() => setEditingKind(null)}
                      disabled={savingKind === selected.kind}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setEditingKind(selected.kind);
                      setMsg("");
                    }}
                  >
                    Edit template
                  </button>
                )}
              </div>

              {previewErr ? (
                <div className="adminNotice adminNotice--error" style={{ marginBottom: 12 }}>
                  <p className="adminNoticeBody">{previewErr}</p>
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Result</div>
                  <iframe
                    title="Email template rendered preview"
                    srcDoc={preview?.htmlBody || ""}
                    style={{
                      width: "100%",
                      minHeight: 360,
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
