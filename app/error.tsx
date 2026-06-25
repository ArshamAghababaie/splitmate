"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-negative/20">
          <AlertTriangle size={32} className="text-ink" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          An unexpected error occurred. Please try again or go back to the
          dashboard.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Button variant="primary" fullWidth onClick={reset}>
            Try again
          </Button>
          <Link href="/dashboard" className="w-full">
            <Button variant="secondary" fullWidth>
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
