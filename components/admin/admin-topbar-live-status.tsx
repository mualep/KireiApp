"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const LIVE_STATUS_PROBE_PATH = "/brand/kireiapp-mark.svg";
const LIVE_STATUS_INTERVAL_MS = 15_000;
const CLOCK_INTERVAL_MS = 1_000;

const clockFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  timeZone: "Asia/Jakarta",
  weekday: "short",
  year: "numeric",
});

export function AdminTopbarLiveStatus() {
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = null;

    function abortActiveProbe() {
      if (controller) {
        controller.abort();
      }
    }

    async function measurePing() {
      abortActiveProbe();
      controller = new AbortController();

      const startedAt = performance.now();

      try {
        const response = await fetch(LIVE_STATUS_PROBE_PATH, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Network probe failed.");
        }

        const elapsedMs = Math.max(
          1,
          Math.round(performance.now() - startedAt),
        );

        if (isMounted) {
          setIsOffline(false);
          setPingMs(elapsedMs);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setIsOffline(true);
          setPingMs(null);
        }
      }
    }

    void measurePing();

    const intervalId = window.setInterval(() => {
      void measurePing();
    }, LIVE_STATUS_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      abortActiveProbe();
    };
  }, []);

  const label = isOffline ? "Offline" : pingMs === null ? "-- ms" : `${pingMs} ms`;

  return (
    <div
      aria-label={`Network latency: ${label}`}
      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      role="status"
    >
      <span className="relative flex size-3" aria-hidden="true">
        {!isOffline ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-on opacity-45 motion-reduce:animate-none" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-3 rounded-full shadow-lg",
            isOffline
              ? "bg-destructive shadow-destructive/40"
              : pingMs === null
                ? "bg-muted-foreground shadow-muted-foreground/30"
                : "bg-status-on shadow-status-on/40",
          )}
        />
      </span>
      <span className="font-mono tabular-nums" translate="no">
        {label}
      </span>
    </div>
  );
}

export function AdminTopbarClock({ initialText }: { initialText: string }) {
  const [timeText, setTimeText] = useState(initialText);

  useEffect(() => {
    function updateClock() {
      setTimeText(clockFormatter.format(new Date()));
    }

    updateClock();

    const intervalId = window.setInterval(updateClock, CLOCK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <time className="hidden text-sm tabular-nums text-muted-foreground sm:block">
      {timeText}
    </time>
  );
}
