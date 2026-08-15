"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refresh tracker page setiap 60 detik supaya versi worker selalu fresh.
// Tanpa ini, cron yang jalan tiap menit akan increment version di DB,
// dan setiap aksi tombol akan menghasilkan tracker.version_conflict.
const TRACKER_REFRESH_INTERVAL_MS = 60_000;

export function TrackerAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, TRACKER_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
