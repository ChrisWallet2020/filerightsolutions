"use client";

import { useMemo, useState } from "react";

export type AdminClientEmailOption = { email: string; fullName: string };

type Props = {
  options: AdminClientEmailOption[];
  /** Set for native form posts (e.g. billing `userEmail`). Omit when using controlled mode only. */
  inputName?: string;
  required?: boolean;
  placeholder?: string;
  /** Controlled value (e.g. filing preview flow). */
  value?: string;
  onChange?: (email: string) => void;
};

const MAX_SUGGESTIONS = 20;

export function AdminClientEmailCombobox({
  options,
  inputName,
  required,
  placeholder = "client@example.com",
  value: controlledValue,
  onChange: controlledOnChange,
}: Props) {
  const [inner, setInner] = useState("");
  const isControlled = controlledValue !== undefined;
  const email = isControlled ? controlledValue! : inner;

  function setEmail(v: string) {
    controlledOnChange?.(v);
    if (!isControlled) setInner(v);
  }

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = email.trim().toLowerCase();
    if (!q) return options.slice(0, MAX_SUGGESTIONS);
    return options
      .filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.fullName.toLowerCase().includes(q)
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [email, options]);

  function pickClient(c: AdminClientEmailOption) {
    setEmail(c.email);
    setSuggestionsOpen(false);
  }

  return (
    <div style={{ position: "relative", maxWidth: 480 }}>
      <input
        type="email"
        name={inputName}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setSuggestionsOpen(true);
        }}
        onFocus={() => setSuggestionsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setSuggestionsOpen(false), 180);
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          fontSize: 15,
          boxSizing: "border-box",
          background: "#fff",
          color: "#0f172a",
        }}
      />
      {suggestionsOpen && filtered.length > 0 ? (
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
          {filtered.map((c) => (
            <li key={c.email} role="option">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickClient(c)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#0f172a",
                  cursor: "pointer",
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                }}
              >
                <div style={{ fontWeight: 700 }}>{c.email}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.fullName}</div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
