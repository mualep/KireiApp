"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center justify-center gap-2 bg-red-600/90 py-2.5 px-4 text-center text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-950/20 backdrop-blur-md border-b border-red-500/30">
        <WifiOff className="size-4 animate-pulse text-white" />
        <span>Koneksi internet terputus. Menunggu koneksi kembali...</span>
      </div>
    </div>
  );
}
