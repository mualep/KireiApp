"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const LIVE_STATUS_PROBE_PATH = "/brand/kireiapp-mark.svg";
const LIVE_STATUS_INTERVAL_MS = 60_000;
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

  // Color coding based on latency
  const pingColorClass = isOffline
    ? "text-rose-500 dark:text-rose-400"
    : pingMs === null
      ? "text-muted-foreground"
      : pingMs < 100
        ? "text-emerald-500 dark:text-emerald-400"
        : pingMs < 200
          ? "text-amber-500 dark:text-amber-400"
          : "text-rose-500 dark:text-rose-400";

  return (
    <div
      aria-label={`Network latency: ${label}`}
      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      role="status"
    >
      {isOffline ? (
        <WifiOff className={cn("size-3.5 shrink-0", pingColorClass)} aria-hidden="true" />
      ) : (
        <Wifi className={cn("size-3.5 shrink-0", pingColorClass)} aria-hidden="true" />
      )}
      <span className={cn("font-mono text-[11px] tabular-nums font-bold", pingColorClass)} translate="no">
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
    <time className="hidden text-xs font-medium tabular-nums text-muted-foreground sm:block" translate="no">
      {mounted ? timeText : initialText}
    </time>
  );
}
