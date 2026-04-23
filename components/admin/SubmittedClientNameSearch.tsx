"use client";

import { useMemo, useState } from "react";

type Props = {
  options: Array<{ fullName: string; email: string }>;
  defaultValue: string;
};

export function SubmittedClientNameSearch({ options, defaultValue }: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 40);

    function isSubsequence(haystack: string, needle: string): boolean {
      if (!needle) return true;
      let j = 0;
      for (let i = 0; i < haystack.length; i += 1) {
        if (haystack[i] === needle[j]) j += 1;
        if (j >= needle.length) return true;
      }
      return false;
    }

    const startsOrContains = options.filter((row) => {
      const lower = row.fullName.toLowerCase();
      return lower.startsWith(q) || lower.includes(q);
    });
    if (startsOrContains.length > 0) return startsOrContains.slice(0, 40);

    const compactQ = q.replace(/\s+/g, "");
    const fuzzy = options.filter((row) =>
      isSubsequence(row.fullName.toLowerCase().replace(/\s+/g, ""), compactQ),
    );
    if (fuzzy.length > 0) return fuzzy.slice(0, 40);

    // Keep dropdown visible with suggestions even when there is no strict match.
    return options.slice(0, 40);
  }, [options, query]);

  return (
    <form
      method="get"
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        gap: 8,
        flex: "0 0 auto",
      }}
    >
      <div style={{ position: "relative" }}>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder="Search client name"
          style={{
            width: 460,
            minWidth: 460,
            maxWidth: 460,
            minHeight: 42,
            padding: "10px 34px 10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
            color: "#475569",
            pointerEvents: "none",
          }}
        >
          v
        </span>
        {open && filtered.length > 0 ? (
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
            {filtered.map((row) => (
              <li key={row.email} role="option">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(row.fullName);
                    setOpen(false);
                  }}
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
                  <span style={{ fontWeight: 700 }}>{row.fullName}</span>
                  <span style={{ marginLeft: 6, color: "#64748b", fontWeight: 400 }}>({row.email})</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button
        type="submit"
        style={{
          flex: "0 0 auto",
          whiteSpace: "nowrap",
          minHeight: 42,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          color: "#0f172a",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Search
      </button>
    </form>
  );
}
