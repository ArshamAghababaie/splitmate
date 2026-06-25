"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-ink">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border-2 border-ink bg-surface-alt px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink focus:shadow-[2px_2px_0px_#FFD600] transition-all duration-150 ${error ? "border-negative" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-negative">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
