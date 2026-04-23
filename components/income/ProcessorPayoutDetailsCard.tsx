"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProcessorPayoutDetails, ProcessorPayoutMethod } from "@/lib/siteSettings";

type Props = {
  role: "processor1" | "processor2";
  initialDetails: ProcessorPayoutDetails;
};

function roleLabel(role: "processor1" | "processor2"): string {
  return role === "processor1" ? "Processor1" : "Processor2";
}

const E_WALLET_PROVIDERS = [
  "GCash",
  "Maya",
  "GoTyme Bank",
  "ShopeePay",
  "GrabPay",
  "Coins.ph",
];

const ONLINE_BANKING_PROVIDERS = [
  "BDO Unibank",
  "BPI (Bank of the Philippine Islands)",
  "Metrobank",
  "Land Bank of the Philippines",
  "PNB (Philippine National Bank)",
  "RCBC",
  "Security Bank",
  "UnionBank",
  "China Bank",
  "EastWest Bank",
  "AUB (Asia United Bank)",
  "PSBank",
  "GoTyme Bank",
  "CIMB Bank Philippines",
  "Tonik Digital Bank",
  "UNO Digital Bank",
];

type PickerOption = {
  value: string;
  label: string;
};

function Picker({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  options: PickerOption[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeLabel = options.find((o) => o.value === value)?.label ?? value;
  const shown = activeLabel || placeholder;

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
          color: shown === placeholder ? "#64748b" : "#0f172a",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>{shown}</span>
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
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderRadius: 8,
                    background: isActive ? "#eff6ff" : "#fff",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 400,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isActive ? "#eff6ff" : "#fff";
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

export function ProcessorPayoutDetailsCard({ role, initialDetails }: Props) {
  const [method, setMethod] = useState<ProcessorPayoutMethod>(initialDetails.method);
  const [provider, setProvider] = useState(initialDetails.provider);
  const [accountName, setAccountName] = useState(initialDetails.accountName);
  const [accountNumber, setAccountNumber] = useState(initialDetails.accountNumber);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const providerOptions = method === "online_banking" ? ONLINE_BANKING_PROVIDERS : E_WALLET_PROVIDERS;
  const normalizedProvider = provider.trim();
  const hasCustomProvider = normalizedProvider.length > 0 && !providerOptions.includes(normalizedProvider);
  const methodOptions: PickerOption[] = useMemo(
    () => [
      { value: "e_wallet", label: "E-wallet" },
      { value: "online_banking", label: "Online banking" },
    ],
    []
  );
  const providerPickerOptions: PickerOption[] = useMemo(() => {
    const out = providerOptions.map((option) => ({ value: option, label: option }));
    if (hasCustomProvider) out.push({ value: normalizedProvider, label: normalizedProvider });
    return out;
  }, [providerOptions, hasCustomProvider, normalizedProvider]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setPending(true);
    try {
      const res = await fetch(`/api/${role}/payout-details`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          provider,
          accountName,
          accountNumber,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.message === "string" ? j.message : "Could not save payout details.");
        return;
      }
      setOk("Payout details saved. Admin will use this account for manual payouts.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="adminCard incomePayoutCard">
      <h2 className="incomeBreakdownTitle">Payout details</h2>
      <p className="muted adminBodyText" style={{ marginBottom: 14 }}>
        {roleLabel(role)}: choose your payout channel and account details for manual disbursement.
      </p>
      <form className="form" onSubmit={(e) => void submit(e)} style={{ maxWidth: 560 }}>
        <label className="adminLabel">
          <strong>Payout channel</strong>
          <Picker
            value={method}
            onChange={(next) => setMethod(next as ProcessorPayoutMethod)}
            options={methodOptions}
            placeholder="Select payout channel"
          />
        </label>
        <label className="adminLabel">
          <strong>{method === "online_banking" ? "Bank name" : "E-wallet provider"}</strong>
          <Picker
            value={provider}
            onChange={setProvider}
            options={providerPickerOptions}
            placeholder={`Select ${method === "online_banking" ? "bank" : "e-wallet provider"}`}
          />
        </label>
        <label className="adminLabel">
          <strong>Account name</strong>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name registered on the account"
            maxLength={120}
          />
        </label>
        <label className="adminLabel">
          <strong>{method === "online_banking" ? "Account number" : "Wallet number"}</strong>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={method === "online_banking" ? "Enter bank account number" : "Enter wallet mobile number"}
            maxLength={40}
          />
        </label>
        <button type="submit" className="btn" disabled={pending} style={{ width: "fit-content" }}>
          {pending ? "Saving..." : "Save details"}
        </button>
      </form>
      {error ? <div className="adminNotice adminNotice--error" style={{ marginTop: 12 }}>{error}</div> : null}
      {ok ? (
        <div className="adminNotice adminNotice--success" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.4 }}>
          {ok}
        </div>
      ) : null}
    </section>
  );
}
