"use client";

import { Plus } from "lucide-react";

type FABProps = {
  onClick: () => void;
};

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-primary shadow-[4px_4px_0px_#0D0D0D] transition-all duration-150 hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
    >
      <Plus size={24} strokeWidth={2.5} className="text-ink" />
    </button>
  );
}
