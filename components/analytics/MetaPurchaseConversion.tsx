"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const POLL_MS = 2000;
const POLL_MAX = 15;

function firePurchaseOnce(orderId: string, amountPhp: number) {
  const key = `fbq_purchase_tracked:${orderId}`;
  try {
    if (sessionStorage.getItem(key)) return;
  } catch {
    /* private mode */
  }
  window.fbq?.("track", "Purchase", {
    value: amountPhp,
    currency: "PHP",
    content_type: "product",
    content_ids: [orderId],
  });
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

type Props = {
  orderId: string;
  amountPhp: number;
  isPaid: boolean;
  /** After gateway redirect, order may still be PENDING until the webhook runs. */
  pollUntilPaid: boolean;
};

export function MetaPurchaseConversion({ orderId, amountPhp, isPaid, pollUntilPaid }: Props) {
  const router = useRouter();
  const pollCount = useRef(0);

  useEffect(() => {
    if (!orderId.trim() || !isPaid) return;
    firePurchaseOnce(orderId.trim(), amountPhp);
  }, [orderId, amountPhp, isPaid]);

  useEffect(() => {
    if (!pollUntilPaid || isPaid || !orderId.trim()) return;
    const id = window.setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current >= POLL_MAX) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [pollUntilPaid, isPaid, orderId, router]);

  return null;
}
