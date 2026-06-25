import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  subtext?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconClassName?: string;
};

export function EmptyState({
  icon: Icon,
  message,
  subtext,
  actionLabel,
  onAction,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-lg border-2 border-ink ${iconClassName ?? "bg-primary"}`}
      >
        <Icon size={28} className="text-ink" />
      </div>
      <p className="text-sm font-semibold text-ink text-center">{message}</p>
      {subtext && (
        <p className="mt-1 text-xs text-ink-muted text-center max-w-60">
          {subtext}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
