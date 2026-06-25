"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  removing?: boolean;
};

type ToastContextType = {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
};

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 3;

const variantConfig: Record<
  ToastVariant,
  { border: string; icon: typeof CheckCircle }
> = {
  success: { border: "border-positive", icon: CheckCircle },
  error: { border: "border-negative", icon: AlertCircle },
  info: { border: "border-ink", icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++idRef.current;
      setToasts((prev) => {
        const next = [...prev, { id, message, variant }];
        if (next.length > MAX_TOASTS) {
          const oldest = next[0];
          setTimeout(() => removeToast(oldest.id), 0);
        }
        return next.slice(-MAX_TOASTS);
      });
      setTimeout(() => removeToast(id), 3000);
    },
    [removeToast],
  );

  const toast = {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error"),
    info: (message: string) => addToast(message, "info"),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => {
          const config = variantConfig[t.variant];
          const Icon = config.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border-2 ${config.border} bg-surface px-4 py-3 shadow-[3px_3px_0px_#0D0D0D] transition-all duration-300 ${
                t.removing
                  ? "opacity-0 translate-y-2"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded p-0.5 hover:bg-surface-alt transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
