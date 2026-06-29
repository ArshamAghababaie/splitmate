"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

function isAtTop() {
  const scrollTop =
    document.scrollingElement?.scrollTop ??
    document.documentElement.scrollTop ??
    window.scrollY;
  return scrollTop < 1;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);
  useEffect(() => { pullDistanceRef.current = pullDistance; }, [pullDistance]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (refreshingRef.current) return;
    if (isAtTop()) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshingRef.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && isAtTop()) {
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.4, 80));
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshingRef.current) return;
    pulling.current = false;
    const currentPull = pullDistanceRef.current;
    if (currentPull >= 48) {
      setRefreshing(true);
      setPullDistance(40);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} style={{ overscrollBehaviorY: "contain" }}>
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 || refreshing ? pullDistance : 0 }}
      >
        <Loader2
          size={20}
          className={`text-ink-muted ${refreshing ? "animate-spin" : ""}`}
          style={{
            transform: `scale(${Math.min(pullDistance / 48, 1)}) rotate(${pullDistance * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
