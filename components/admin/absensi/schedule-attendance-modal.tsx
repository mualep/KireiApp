"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { CalendarPlus, Loader2 } from "lucide-react";
import type { ScheduledAttendanceStatus } from "@/lib/scheduling/types";

interface ScheduleAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: Array<{ id: string; name: string }>;
  initialUserId?: string;
  initialWorkerName?: string;
  initialTargetDate?: string;
  onSuccess?: () => void;
}

export function ScheduleAttendanceModal({
  open,
  onOpenChange,
  workers,
  initialUserId,
  initialWorkerName,
  initialTargetDate,
  onSuccess,
}: ScheduleAttendanceModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [userId, setUserId] = useState(initialUserId || "");
  const [targetDate, setTargetDate] = useState(initialTargetDate || "");
  const [status, setStatus] = useState<ScheduledAttendanceStatus>("cuti");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial values when modal opens or selection changes
  useEffect(() => {
    if (open) {
      if (initialUserId) setUserId(initialUserId);
      if (initialTargetDate) setTargetDate(initialTargetDate);
    }
  }, [open, initialUserId, initialTargetDate]);

  // Calculate tomorrow WIB date string as min date
  const now = new Date();
  const WIB_OFFSET = 7 * 60 * 60 * 1000;
  const tomorrowWib = new Date(now.getTime() + WIB_OFFSET + 24 * 60 * 60 * 1000);
  const minDateStr = tomorrowWib.toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast({
        variant: "destructive",
        title: "Gagal Penjadwalan",
        description: "Pilih pekerja terlebih dahulu.",
      });
      return;
    }

    if (!targetDate) {
      toast({
        variant: "destructive",
        title: "Tanggal Tidak Valid",
        description: "Pilih tanggal penjadwalan.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/absensi/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          target_date: targetDate,
          status,
          notes: notes.trim() || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal membuat penjadwalan absensi");
      }

      const activeWorkerName = initialWorkerName || workers.find((w) => w.id === userId)?.name || "Pekerja";

      toast({
        title: "Penjadwalan Berhasil",
        description: `Absensi ${status.toUpperCase()} untuk ${activeWorkerName} tanggal ${targetDate} berhasil dijadwalkan.${
          status === "cuti" ? " Stok cuti telah dipotong 1." : ""
        }`,
        className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
      });

      // Reset form
      setNotes("");
      onOpenChange(false);

      router.refresh();
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({
        variant: "destructive",
        title: "Gagal Menjadwalkan",
        description: message,
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWorkerName = initialWorkerName || workers.find((w) => w.id === userId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] rounded-xl border p-6">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarPlus className="size-5 text-primary" />
            Jadwalkan Absensi Masa Depan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Daftarkan izin Cuti, Sakit, Pending, atau Alpha pekerja untuk tanggal mendatang.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2 text-xs">
          {/* Pre-filled info box if triggered from cell */}
          {initialWorkerName && initialTargetDate ? (
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-foreground">{initialWorkerName}</span>
                <span className="font-mono font-bold text-xs text-primary">{initialTargetDate}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Penjadwalan langsung via sel matriks kalender</span>
            </div>
          ) : (
            <>
              {/* Worker Select */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-muted-foreground">Pekerja</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input px-3 py-2 text-xs bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">-- Pilih Pekerja --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Date */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-muted-foreground">
                  Tanggal Masa Depan (Min: Besok)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  min={minDateStr}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input px-3 py-2 text-xs bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </>
          )}

          {/* Status Select */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-muted-foreground">Status Absensi</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ScheduledAttendanceStatus)}
              className="w-full rounded-lg border border-input px-3 py-2 text-xs bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring font-bold"
            >
              <option value="cuti">CUTI (Potong Stok Cuti 1)</option>
              <option value="sakit">SAKIT</option>
              <option value="pending">PENDING</option>
              <option value="alpha">ALPHA</option>
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-muted-foreground">Keterangan / Catatan (Opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Izin cuti acara keluarga..."
              rows={3}
              className="w-full rounded-lg border border-input p-3 text-xs bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter className="mt-2 pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 px-4 font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 font-bold text-xs flex items-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Simpan Penjadwalan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
