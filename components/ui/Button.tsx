"use client";

export function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  ...rest
}: any) {
  const cls =
    variant === "secondary"
      ? `btn btnSecondary ${className}`
      : `btn ${className}`;

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}