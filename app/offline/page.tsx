"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-surface-alt">
          <WifiOff size={32} className="text-ink-muted" />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink">
          You&apos;re offline
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Check your internet connection. Cached pages may still be available.
        </p>

        <Button
          variant="primary"
          fullWidth
          className="mt-8"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>

        <p className="mt-8 text-xs text-ink-muted">SplitMate</p>
      </div>
    </div>
  );
}
