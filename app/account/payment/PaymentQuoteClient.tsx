"use client";

import { useState } from "react";

type Props = {
  quoteToken: string;
  disabled?: boolean;
  label?: string;
};

export function PaymentQuoteClient({ quoteToken, disabled, label }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function proceed() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkout/create-quote-order", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.error === "string" ? data.error : "request_failed";
        const map: Record<string, string> = {
          unauthorized: "Please sign in again.",
          quote_not_found: "This payment link is invalid or not for your account.",
          quote_expired: "This payment link has expired. Contact us for a new link.",
          quote_cancelled: "This quote is no longer active.",
          quote_unavailable: "This quote is no longer available. Contact us if you need help.",
          already_paid: "This invoice is already marked as paid.",
          invalid_amount: "The amount for this quote is invalid. Please contact support.",
          payment_not_configured: "Payment is temporarily unavailable. Please contact support.",
          payment_provider_error: "Could not open the payment gateway. Please try again shortly.",
          server_error: "Something went wrong. Please try again shortly.",
        };
        setErr(map[code] || "Could not start payment.");
        setLoading(false);
        return;
      }
      const nextUrl =
        data && typeof data === "object" && data.paymentInstruction && typeof data.paymentInstruction.nextUrl === "string"
          ? data.paymentInstruction.nextUrl
          : null;
      if (nextUrl) {
        window.location.href = nextUrl;
        return;
      }
      setErr("Payment could not be started.");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {err}
        </div>
      )}
      <button
        type="button"
        onClick={proceed}
        disabled={disabled || loading}
        className={loading ? "btnIsPending" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: disabled ? "#94a3b8" : "#0f172a",
          color: "#fff",
          fontWeight: 800,
          cursor: disabled || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <span className="btnWithSpinner" style={{ color: "#fff" }}>
            <span className="btnSpinner" aria-hidden />
            Working…
          </span>
        ) : (
          (label || "Proceed to secure payment")
        )}
      </button>
    </div>
  );
}
