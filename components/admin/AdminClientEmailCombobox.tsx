"use client";

import { useMemo, useState } from "react";

export type AdminClientEmailOption = { email: string; fullName: string };

/** Primary label for pickers; disambiguates duplicate full names with email in parentheses. */
export function optionDisplayLabel(c: AdminClientEmailOption, options: AdminClientEmailOption[]): string {
  const name = c.fullName.trim() || c.email;
  const n = c.fullName.trim().toLowerCase();
  const dup = n && options.filter((o) => o.fullName.trim().toLowerCase() === n).length > 1;
  return dup ? `${name} (${c.email})` : name;
}

function fullNameHasDuplicate(fullName: string, options: AdminClientEmailOption[]): boolean {
  const n = fullName.trim().toLowerCase();
  if (!n) return false;
  return options.filter((o) => o.fullName.trim().toLowerCase() === n).length > 1;
}

function NameVariantSuggestionRow({
  c,
  options,
}: {
  c: AdminClientEmailOption;
  options: AdminClientEmailOption[];
}) {
  const displayName = c.fullName.trim() || c.email;
  const dup = fullNameHasDuplicate(c.fullName, options);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontWeight: 700 }}>{displayName}</span>
      {dup ? (
        <span style={{ fontWeight: 400, fontSize: 13, color: "#64748b" }}>{c.email}</span>
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

type Props = {
  options: AdminClientEmailOption[];
  /** Set for native form posts (e.g. billing `userEmail`). Omit when using controlled mode only. */
  inputName?: string;
  required?: boolean;
  placeholder?: string;
  /** Controlled value (e.g. filing preview flow). */
  value?: string;
  onChange?: (email: string) => void;
  /**
   * `name` = search/select by full name; sign-in email is still posted as `inputName` (hidden field).
   * Only applies with `inputName` and without controlled `value`; otherwise treated as `email`.
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
  const effectiveVariant =
    variantProp === "name" && !isControlled && inputName ? "name" : "email";

  const [inner, setInner] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [committedEmail, setCommittedEmail] = useState("");

  const email = isControlled ? controlledValue! : inner;

  function setEmail(v: string) {
    controlledOnChange?.(v);
    if (!isControlled) setInner(v);
  }

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q =
      effectiveVariant === "name"
        ? nameQuery.trim().toLowerCase()
        : email.trim().toLowerCase();
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
  }, [email, nameQuery, options, effectiveVariant]);

  function pickClient(c: AdminClientEmailOption) {
    if (effectiveVariant === "name") {
      setCommittedEmail(c.email);
      setNameQuery(optionDisplayLabel(c, options));
    } else {
      setEmail(c.email);
    }
    setSuggestionsOpen(false);
  }

  function onBlurNameField() {
    window.setTimeout(() => {
      setSuggestionsOpen(false);
      const resolved = tryResolveClientEmail(nameQuery, options);
      if (resolved) {
        setCommittedEmail(resolved.email);
        setNameQuery(optionDisplayLabel(resolved, options));
      }
    }, 180);
  }

  if (effectiveVariant === "name" && inputName) {
    return (
      <div style={{ position: "relative", maxWidth: 480 }}>
        {/* Visible control first so a wrapping <label> targets this field, not the hidden email. */}
        <input
          type="text"
          value={nameQuery}
          onChange={(e) => {
            setNameQuery(e.target.value);
            setCommittedEmail("");
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
            fontSize: 15,
            boxSizing: "border-box",
            background: "#fff",
            color: "#0f172a",
          }}
        />
        <input type="hidden" name={inputName} value={committedEmail} onChange={() => {}} />
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
                  <NameVariantSuggestionRow c={c} options={options} />
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
