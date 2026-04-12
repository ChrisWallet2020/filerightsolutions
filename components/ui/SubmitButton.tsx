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

  // Keep a stable single child under <button> so pending toggles don’t swap the root node type
  // (reduces rare React “removeChild” reconciliation errors with useFormStatus).
  return (
    <button
      type="submit"
      className={`${className}${isPending ? " btnIsPending" : ""}`}
      disabled={isPending}
      style={style}
    >
      <span className="btnWithSpinner">
        {isPending ? (
          <>
            <span className={`btnSpinner${spinnerOnLightBg ? " btnSpinner--onLight" : ""}`} aria-hidden />
            <span>{pendingLabel ?? children}</span>
          </>
        ) : (
          <span>{children}</span>
        )}
      </span>
    </button>
  );
}
