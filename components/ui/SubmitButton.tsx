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
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={`${className}${pending ? " btnIsPending" : ""}`} disabled={pending} style={style}>
      {pending ? (
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
