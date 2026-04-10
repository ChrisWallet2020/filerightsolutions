"use client";

export function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  loading = false,
  disabled,
  ...rest
}: any) {
  const cls =
    variant === "secondary"
      ? `btn btnSecondary ${className}`
      : `btn ${className}`;

  return (
    <button
      type={type}
      className={`${cls}${loading ? " btnIsPending" : ""}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btnWithSpinner">
          <span
            className={`btnSpinner${variant === "secondary" ? " btnSpinner--onLight" : ""}`}
            aria-hidden
          />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}