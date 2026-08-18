"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { CalendarClock, Trash2, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import type { ScheduledAttendanceDTO } from "@/lib/scheduling/types";
import { cn } from "@/lib/utils";

interface ScheduledAttendanceListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onScheduledChanged?: () => void;
}

export function ScheduledAttendanceList({
  open,
  onOpenChange,
  canManage,
  onScheduledChanged,
}: ScheduledAttendanceListProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<ScheduledAttendanceDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/absensi/schedule");
      const result = await res.json();
      if (res.ok && result.success) {
        setSchedules(result.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchSchedules();
      setConfirmCancelId(null);
    }
  }, [open, fetchSchedules]);

  const handleCancelExecution = async (id: string, workerName: string, status: string) => {
    try {
      setCancellingId(id);
      const res = await fetch(`/api/absensi/schedule/${id}/cancel`, {
        method: "PATCH",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal membatalkan penjadwalan");
      }

      toast({
        title: "Penjadwalan Dibatalkan",
        description: `Penjadwalan ${status.toUpperCase()} untuk ${workerName} telah dibatalkan.${
          status === "cuti" ? " 1 stok cuti dikembalikan." : ""
        }`,
        className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
      });

      setConfirmCancelId(null);
      await fetchSchedules();
      router.refresh();
      onScheduledChanged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({
        variant: "destructive",
        title: "Gagal Dibatalkan",
        description: message,
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cuti":
        return <Badge variant="outline" className="border-sky-500/40 bg-sky-500/15 text-sky-400 font-bold uppercase text-[10px]">CUTI</Badge>;
      case "sakit":
        return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/15 text-amber-400 font-bold uppercase text-[10px]">SAKIT</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-purple-500/40 bg-purple-500/15 text-purple-400 font-bold uppercase text-[10px]">PENDING</Badge>;
      case "alpha":
        return <Badge variant="outline" className="border-rose-500/40 bg-rose-500/15 text-rose-400 font-bold uppercase text-[10px]">ALPHA</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl border p-6">
        <DialogHeader className="gap-1.5 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <CalendarClock className="size-5 text-primary" />
              Daftar Penjadwalan Absensi Mendatang
            </DialogTitle>
            <DialogDescription className="text-xs">
              Jadwal absensi pekerja untuk tanggal mendatang yang belum diterapkan.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchSchedules}
            disabled={loading}
            title="Refresh Jadwal"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {loading && schedules.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2">
              <Loader2 className="size-4 animate-spin" />
              Memuat jadwal mendatang...
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground/60 italic text-xs border border-dashed rounded-xl">
              Tidak ada penjadwalan absensi mendatang saat ini.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {schedules.map((item) => {
                const isConfirming = confirmCancelId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/40 bg-card/40 hover:bg-card/75 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground" translate="no">
                            {item.worker_name}
                          </span>
                          {getStatusBadge(item.status)}
                          <span className="font-mono text-xs font-bold text-primary">
                            {item.target_date}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Dijadwalkan oleh <span className="font-semibold text-foreground">{item.scheduler_name}</span>
                          {item.notes ? ` — "${item.notes}"` : ""}
                        </span>
                      </div>

                      {canManage && !isConfirming ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancellingId === item.id}
                          onClick={() => setConfirmCancelId(item.id)}
                          className="h-8 px-2.5 text-[11px] font-bold text-rose-500 border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-400 shrink-0"
                        >
                          <Trash2 className="size-3 mr-1" />
                          Batalkan
                        </Button>
                      ) : null}
                    </div>

                    {/* Inline Web Custom Confirmation */}
                    {isConfirming && (
                      <div className="mt-1 p-3 rounded-lg border border-red-500/35 bg-red-500/10 text-red-300 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 text-[11px]">
                          <AlertTriangle className="size-4 text-red-400 shrink-0" />
                          <span>
                            Batalkan jadwal <strong className="uppercase">{item.status}</strong>? {item.status === 'cuti' ? 'Stok cuti dikembalikan.' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmCancelId(null)}
                            disabled={cancellingId === item.id}
                            className="h-7 px-2 text-[11px]"
                          >
                            Batal
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelExecution(item.id, item.worker_name || "Pekerja", item.status)}
                            disabled={cancellingId === item.id}
                            className="h-7 px-2 text-[11px] font-bold bg-rose-600 hover:bg-rose-700"
                          >
                            {cancellingId === item.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                            Ya, Batalkan
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
