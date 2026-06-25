import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border-2 border-ink rounded-lg shadow-[4px_4px_0px_#0D0D0D] p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
