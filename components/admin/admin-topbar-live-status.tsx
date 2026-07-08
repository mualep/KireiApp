"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const LIVE_STATUS_PROBE_PATH = "/brand/kireiapp-mark.svg";
const LIVE_STATUS_INTERVAL_MS = 15_000;
const CLOCK_INTERVAL_MS = 1_000;

const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const INDO_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des"
];

function formatIndoDateTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const partMap = new Map(parts.map(p => [p.type, p.value]));
  
  const year = partMap.get("year") || "";
  const monthIdx = parseInt(partMap.get("month") || "1", 10) - 1;
  const monthStr = INDO_MONTHS[monthIdx] || "";
  const day = partMap.get("day") || "";
  
  const hour = (partMap.get("hour") || "00").padStart(2, "0");
  const minute = (partMap.get("minute") || "00").padStart(2, "0");
  const second = (partMap.get("second") || "00").padStart(2, "0");
  
  const wibTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const dayOfWeek = INDO_DAYS[wibTime.getDay()] || "";
  
  return `${dayOfWeek}, ${day} ${monthStr} ${year}, ${hour}:${minute}:${second}`;
}

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);

    function updateClock() {
      setTimeText(formatIndoDateTime(new Date()));
    }

    updateClock();

    const intervalId = window.setInterval(updateClock, CLOCK_INTERVAL_MS);

    return () => {
      clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <time className="hidden text-sm tabular-nums text-muted-foreground sm:block" translate="no">
      {mounted ? timeText : initialText}
    </time>
  );
}
