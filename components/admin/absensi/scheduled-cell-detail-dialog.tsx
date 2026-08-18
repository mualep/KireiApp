"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { CalendarClock, Trash2, Loader2 } from "lucide-react";
import type { ScheduledCellDTO } from "@/lib/absensi/data";

interface ScheduledCellDetailDialogProps {
  scheduled: (ScheduledCellDTO & { workerName: string }) | null;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onSuccess?: () => void;
}

export function ScheduledCellDetailDialog({
  scheduled,
  onOpenChange,
  canManage,
  onSuccess,
}: ScheduledCellDetailDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!scheduled) return null;

  const handleCancel = async () => {
    if (
      !confirm(
        `Batalkan penjadwalan ${scheduled.status.toUpperCase()} untuk ${scheduled.workerName}?${
          scheduled.status === "cuti" ? " Stok cuti akan dikembalikan." : ""
        }`
      )
    ) {
      return;
    }

    try {
      setIsCancelling(true);
      const res = await fetch(`/api/absensi/schedule/${scheduled.id}/cancel`, {
        method: "PATCH",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal membatalkan penjadwalan");
      }

      toast({
        title: "Penjadwalan Dibatalkan",
        description: `Penjadwalan ${scheduled.status.toUpperCase()} untuk ${scheduled.workerName} telah dibatalkan.${
          scheduled.status === "cuti" ? " 1 stok cuti dikembalikan." : ""
        }`,
        className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
      });

      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({
        variant: "destructive",
        title: "Gagal Dibatalkan",
        description: message,
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
    } finally {
      setIsCancelling(false);
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
    <Dialog open={Boolean(scheduled)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-xl border p-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="size-5 text-primary" />
            Detail Penjadwalan Absensi
          </DialogTitle>
          <DialogDescription className="text-xs">
            Informasi rincian izin absensi mendatang yang sudah terdaftar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-3 text-xs">
          <div className="flex justify-between items-center p-3 rounded-xl border border-border/40 bg-card/40">
            <div className="flex flex-col gap-0.5">
              <span className="font-extrabold text-sm text-foreground">{scheduled.workerName}</span>
              <span className="text-[11px] text-muted-foreground">Pekerja Terdaftar</span>
            </div>
            {getStatusBadge(scheduled.status)}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg border border-border/40 bg-card/20 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Tanggal Target</span>
              <span className="font-mono font-bold text-xs text-primary">{scheduled.targetDate}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/40 bg-card/20 flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Dijadwalkan Oleh</span>
              <span className="font-semibold text-xs text-foreground">{scheduled.schedulerName || "System"}</span>
            </div>
          </div>

          {scheduled.notes ? (
            <div className="p-3 rounded-lg border border-border/40 bg-card/20 flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Catatan / Keterangan</span>
              <span className="text-xs text-foreground leading-relaxed">&ldquo;{scheduled.notes}&rdquo;</span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-2 pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
            className="h-9 px-4 font-bold text-xs"
          >
            Tutup
          </Button>

          {canManage ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
              className="h-9 px-4 font-bold text-xs flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {isCancelling ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Batalkan Penjadwalan
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
