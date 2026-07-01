"use client";

import { useEffect, useRef, useState } from "react";

const CHECK_INTERVAL_MS = 60_000;

export function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const onUpdateFound = () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = newWorker;
          setShowUpdate(true);
        }
      });
    };

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;

      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = reg.waiting;
        setShowUpdate(true);
      }

      reg.addEventListener("updatefound", onUpdateFound);
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    const checkForNewVersion = async () => {
      try {
        const res = await fetch("/api/sw-version", { cache: "no-store" });
        const { version } = await res.json();
        if (version && version !== process.env.NEXT_PUBLIC_BUILD_ID) {
          registration?.update();
        }
      } catch {
        // network unavailable; ignore and retry on next interval
      }
    };

    const interval = setInterval(checkForNewVersion, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForNewVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      registration?.removeEventListener("updatefound", onUpdateFound);
    };
  }, []);

  const handleUpdate = () => {
    waitingWorkerRef.current?.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-lg border-2 border-ink bg-ink p-4 shadow-[4px_4px_0px_var(--color-ink)] md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <span className="text-sm font-bold text-white">New version available!</span>
      <button
        onClick={handleUpdate}
        className="ml-4 rounded-lg border-2 border-ink bg-primary px-4 py-1.5 text-sm font-black text-ink"
      >
        Update
      </button>
    </div>
  );
}
