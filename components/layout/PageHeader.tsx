"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  showBack?: boolean;
  action?: ReactNode;
};

export function PageHeader({ title, showBack = false, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b-2 border-ink bg-surface px-4 py-3">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink hover:bg-surface-alt transition-colors duration-150"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <h1 className="flex-1 font-display text-lg font-bold text-ink truncate">
        {title}
      </h1>
      {action && <div>{action}</div>}
    </header>
  );
}
