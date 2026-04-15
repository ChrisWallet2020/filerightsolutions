"use client";

import { useEffect, useMemo, useState } from "react";

export type AdminClientEmailOption = {
  email: string;
  fullName: string;
  /** ISO 8601 — optional; filing confirmation UI uses for “last sent”. */
  lastFilingNotifySentAt?: string | null;
};

/** Primary label for pickers; disambiguates duplicate full names with email in parentheses. */
export function optionDisplayLabel(c: AdminClientEmailOption, options: AdminClientEmailOption[]): string {
  const name = c.fullName.trim() || c.email;
  const n = c.fullName.trim().toLowerCase();
  const dup = n && options.filter((o) => o.fullName.trim().toLowerCase() === n).length > 1;
  return dup ? `${name} (${c.email})` : name;
}

function isDuplicateFullName(c: AdminClientEmailOption, options: AdminClientEmailOption[]): boolean {
  const n = c.fullName.trim().toLowerCase();
  return Boolean(n && options.filter((o) => o.fullName.trim().toLowerCase() === n).length > 1);
}

function OptionNameRow({ c, options }: { c: AdminClientEmailOption; options: AdminClientEmailOption[] }) {
  const name = c.fullName.trim() || c.email;
  const dup = isDuplicateFullName(c, options);
  return (
    <div style={{ fontSize: 14, lineHeight: 1.35 }}>
      <span style={{ fontWeight: 700 }}>{name}</span>
      {dup ? (
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({c.email})</span>
      ) : null}
    </div>
  );
}

function tryResolveClientEmail(
  raw: string,
  options: AdminClientEmailOption[]
): AdminClientEmailOption | null {
  const q = raw.trim();
  if (!q) return null;
  const ql = q.toLowerCase();
  const byEmail = options.find((o) => o.email.toLowerCase() === ql);
  if (byEmail) return byEmail;
  const labelMatches = options.filter(
    (o) => optionDisplayLabel(o, options).toLowerCase() === ql
  );
  if (labelMatches.length === 1) return labelMatches[0];
  const byFull = options.filter((o) => o.fullName.trim().toLowerCase() === ql);
  if (byFull.length === 1) return byFull[0];
  return null;
}

type NameKind = "none" | "form" | "controlled";

type Props = {
  options: AdminClientEmailOption[];
  inputName?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (email: string) => void;
  /**
   * `name` = search/select by full name. With `inputName` (no `value`) uses a hidden field for email.
   * With controlled `value` + `onChange`, email is held in parent state.
   */
  variant?: "email" | "name";
};

const MAX_SUGGESTIONS = 20;

export function AdminClientEmailCombobox({
  options,
  inputName,
  required,
  placeholder,
  value: controlledValue,
  onChange: controlledOnChange,
  variant: variantProp = "email",
}: Props) {
  const isControlled = controlledValue !== undefined;

  const nameKind: NameKind =
    variantProp === "name" && inputName && !isControlled
      ? "form"
      : variantProp === "name" && isControlled && controlledOnChange
        ? "controlled"
        : "none";

  const [inner, setInner] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [committedEmail, setCommittedEmail] = useState("");

  const email = isControlled ? controlledValue! : inner;

  // When `email` is cleared while typing, do not reset `nameQuery` here (parent clears `email` on each keystroke).
  useEffect(() => {
    if (nameKind !== "controlled") return;
    const em = (controlledValue ?? "").trim().toLowerCase();
    if (!em) return;
    const opt = options.find((o) => o.email.toLowerCase() === em);
    setNameQuery(opt ? optionDisplayLabel(opt, options) : (controlledValue ?? "").trim());
  }, [nameKind, controlledValue, options]);

  function setEmail(v: string) {
    controlledOnChange?.(v);
    if (!isControlled) setInner(v);
  }

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q =
      nameKind !== "none" ? nameQuery.trim().toLowerCase() : email.trim().toLowerCase();
    if (!q) return options.slice(0, MAX_SUGGESTIONS);
    return options
      .filter((c) => {
        const label = optionDisplayLabel(c, options).toLowerCase();
        return (
          label.includes(q) ||
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [email, nameQuery, options, nameKind]);

  function pickClient(c: AdminClientEmailOption) {
    if (nameKind === "form") {
      setCommittedEmail(c.email);
      setNameQuery(optionDisplayLabel(c, options));
    } else if (nameKind === "controlled") {
      setNameQuery(optionDisplayLabel(c, options));
      controlledOnChange?.(c.email);
    } else {
      setEmail(c.email);
    }
    setSuggestionsOpen(false);
  }

  function onBlurNameField() {
    window.setTimeout(() => {
      setSuggestionsOpen(false);
      const resolved = tryResolveClientEmail(nameQuery, options);
      if (!resolved) return;
      if (nameKind === "form") {
        setCommittedEmail(resolved.email);
        setNameQuery(optionDisplayLabel(resolved, options));
      } else if (nameKind === "controlled") {
        setNameQuery(optionDisplayLabel(resolved, options));
        controlledOnChange?.(resolved.email);
      }
    }, 180);
  }

  if (nameKind === "form" || nameKind === "controlled") {
    return (
      <div style={{ position: "relative", maxWidth: 480 }}>
        <input
          type="text"
          value={nameQuery}
          onChange={(e) => {
            setNameQuery(e.target.value);
            if (nameKind === "form") setCommittedEmail("");
            if (nameKind === "controlled") controlledOnChange?.("");
            setSuggestionsOpen(true);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={onBlurNameField}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            boxSizing: "border-box",
            background: "#fff",
            color: "#0f172a",
          }}
        />
        {nameKind === "form" && inputName ? (
          <input type="hidden" name={inputName} value={committedEmail} onChange={() => {}} />
        ) : null}
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
                  <OptionNameRow c={c} options={options} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
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
          fontSize: 14,
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
