import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-primary">
          <Search size={32} className="text-ink" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-2">
          Page not found
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/dashboard" className="w-full">
          <Button variant="primary" fullWidth>
            Go back home
          </Button>
        </Link>
      </div>
    </div>
  );
}
