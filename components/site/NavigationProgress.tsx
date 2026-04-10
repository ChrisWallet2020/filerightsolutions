"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "busy" | "finishing";

/**
 * Slim top bar during in-app navigation (Next Link) and full-page form POSTs.
 * Gives feedback near the tab area without extra dependencies.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const routeKeyRef = useRef("");

  const search = searchParams?.toString() ?? "";
  const routeKey = `${pathname ?? ""}?${search}`;

  useEffect(() => {
    if (!routeKeyRef.current) {
      routeKeyRef.current = routeKey;
      return;
    }
    if (routeKeyRef.current !== routeKey) {
      routeKeyRef.current = routeKey;
      setPhase((p) => (p === "busy" ? "finishing" : "idle"));
      const t = window.setTimeout(() => setPhase("idle"), 320);
      return () => window.clearTimeout(t);
    }
  }, [routeKey]);

  useEffect(() => {
    function startIfInternalNavigation(a: HTMLAnchorElement) {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (a.getAttribute("target") === "_blank" || a.hasAttribute("download")) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const nextKey = `${url.pathname}?${url.searchParams.toString()}`;
        if (nextKey === routeKeyRef.current) return;
      } catch {
        return;
      }
      setPhase("busy");
    }

    function onClickCapture(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a");
      if (!a) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      startIfInternalNavigation(a);
    }

    function onSubmitCapture(e: Event) {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = (form.getAttribute("method") || "get").toLowerCase();
      if (method === "get") return;
      const action = form.getAttribute("action");
      if (!action) return;
      try {
        const url = new URL(action, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      setPhase("busy");
    }

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("submit", onSubmitCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("submit", onSubmitCapture, true);
    };
  }, []);

  const visible = phase !== "idle";

  return (
    <div
      className={`navRouteProgress${visible ? " navRouteProgress--visible" : ""}${phase === "finishing" ? " navRouteProgress--finishing" : ""}`}
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy={visible}
    >
      <div className="navRouteProgress__bar" />
    </div>
  );
}
