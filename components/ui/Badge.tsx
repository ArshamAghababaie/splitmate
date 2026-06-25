import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-primary px-2 py-0.5 text-xs font-semibold text-ink ${className}`}
    >
      {children}
    </span>
  );
}
