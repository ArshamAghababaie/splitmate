"use client";

import { useEffect, useState, type ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleTransitionEnd = () => {
    if (!open) setMounted(false);
  };

  if (!mounted && !open) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border-t-2 border-x-2 border-ink bg-surface transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flex justify-center">
          <div className="mt-3 mb-4 h-1.5 w-10 rounded-full bg-ink-muted" />
        </div>
        {title && (
          <h2 className="px-5 pb-3 font-display text-lg font-semibold text-ink">
            {title}
          </h2>
        )}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </>
  );
}
