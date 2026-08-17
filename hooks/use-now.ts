"use client";

import { useCallback, useSyncExternalStore } from "react";

let globalNowMs: number = typeof window !== "undefined" ? Date.now() : 0;
const listeners = new Set<() => void>();
let timerId: number | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (timerId === null && typeof window !== "undefined") {
    globalNowMs = Date.now();
    timerId = window.setInterval(() => {
      globalNowMs = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };
}

function getSnapshot() {
  return globalNowMs;
}

function getServerSnapshot() {
  return 0;
}

/**
 * Custom hook that returns the current timestamp (Date.now()) updated every 1000ms.
 * Uses a single global interval shared across subscribing components.
 * If enabled === false, it DOES NOT subscribe to the store, preventing unnecessary card re-renders.
 */
export function useNow(enabled: boolean = true): number | null {
  const subscribeFn = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled) {
        return () => {};
      }
      return subscribe(onStoreChange);
    },
    [enabled],
  );

  const getSnapshotFn = useCallback(() => {
    return enabled ? getSnapshot() : 0;
  }, [enabled]);

  const nowMs = useSyncExternalStore(
    subscribeFn,
    getSnapshotFn,
    getServerSnapshot,
  );

  return enabled && nowMs > 0 ? nowMs : null;
}
