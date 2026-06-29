"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "splitmate_install_dismissed";
const DISMISS_EXPIRY_DAYS = 30;

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [androidMode, setAndroidMode] = useState<"prompt" | "manual">("manual");
  const [visible, setVisible] = useState(false);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_EXPIRY_DAYS) return;
    }

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone)
    ) {
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    setPlatform("android");

    const handler = (e: Event) => {
      e.preventDefault();
      if (promptTimer.current) clearTimeout(promptTimer.current);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setAndroidMode("prompt");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    promptTimer.current = setTimeout(() => {
      setAndroidMode("manual");
      setVisible(true);
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 border-b-2 border-ink bg-primary px-4 py-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">
            Install SplitMate for quick access
          </p>
          {platform === "ios" && (
            <p className="text-xs text-ink/70 mt-0.5 flex items-center gap-1">
              Tap <Share size={12} className="inline" /> then &quot;Add to Home
              Screen&quot;
            </p>
          )}
          {platform === "android" && androidMode === "manual" && (
            <p className="text-xs text-ink/70 mt-0.5 flex items-center gap-1">
              Tap <MoreVertical size={12} className="inline" /> then &quot;Add to
              Home Screen&quot;
            </p>
          )}
        </div>
        {platform === "android" && androidMode === "prompt" && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5"
          >
            <Download size={14} />
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink hover:bg-ink/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
