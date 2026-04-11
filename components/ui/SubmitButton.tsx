"use client";

import type { CSSProperties, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Use on light gray/white buttons so the spinner is visible */
  spinnerOnLightBg?: boolean;
  /**
   * When set, drives the pending UI (spinner + disabled) instead of relying only on `useFormStatus`.
   * Use for fetch-based submits where the browser does not keep the form in React’s “transition pending” state.
   */
  pendingExternal?: boolean;
};

/**
 * Must be rendered inside a <form>. Shows a spinner and disables while the form POST is in flight.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn",
  style,
  spinnerOnLightBg = false,
  pendingExternal,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isPending = pendingExternal ?? pending;

  return (
    <button
      type="submit"
      className={`${className}${isPending ? " btnIsPending" : ""}`}
      disabled={isPending}
      style={style}
    >
      {isPending ? (
        <span className="btnWithSpinner">
          <span className={`btnSpinner${spinnerOnLightBg ? " btnSpinner--onLight" : ""}`} aria-hidden />
          {pendingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
