"use client";

import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-ink border-2 border-ink shadow-[4px_4px_0px_#0D0D0D] hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
  secondary:
    "bg-surface text-ink border-2 border-ink shadow-[4px_4px_0px_#0D0D0D] hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
  ghost:
    "bg-transparent text-ink hover:bg-surface-alt",
  danger:
    "bg-negative text-white border-2 border-ink shadow-[4px_4px_0px_#0D0D0D] hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2.5 font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
