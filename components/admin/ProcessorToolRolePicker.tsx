"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RoleValue = "both" | "processor1" | "processor2";

type Option = {
  value: RoleValue;
  label: string;
};

const OPTIONS: Option[] = [
  { value: "both", label: "Processor1 + Processor2" },
  { value: "processor1", label: "Processor1 only" },
  { value: "processor2", label: "Processor2 only" },
];

export function ProcessorToolRolePicker({ defaultValue = "both" }: { defaultValue?: RoleValue }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<RoleValue>(defaultValue);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = useMemo(
    () => OPTIONS.find((opt) => opt.value === value)?.label ?? OPTIONS[0].label,
    [value],
  );

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
      <input type="hidden" name="targetRole" value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
          {OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setValue(opt.value);
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
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
