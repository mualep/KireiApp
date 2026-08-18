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
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import type { UsersManagerRowDTO } from "@/lib/users/data";

interface HardDeleteWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: UsersManagerRowDTO | null;
  onSuccess?: () => void;
}

export function HardDeleteWorkerDialog({
  open,
  onOpenChange,
  row,
  onSuccess,
}: HardDeleteWorkerDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!row) return null;

  const isConfirmed = confirmName.trim().toLowerCase() === row.name.trim().toLowerCase();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfirmed) {
      toast({
        variant: "destructive",
        title: "Nama Pekerja Tidak Sesuai",
        description: "Ketik nama pekerja dengan tepat untuk mengonfirmasi.",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/users/${row.id}/hard-delete`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menghapus pekerja secara permanen.");
      }

      toast({
        title: "Pekerja Dihapus Permanen",
        description: `Pekerja ${row.name} dan seluruh data historisnya berhasil dihapus dari database.`,
        className: "border-green-500/30 bg-green-500/10 text-green-500 backdrop-blur-md",
      });

      setConfirmName("");
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Pekerja",
        description: message,
        className: "border-red-500/30 bg-red-500/10 text-red-500 backdrop-blur-md",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-xl border border-red-500/40 p-6 bg-card">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-500">
            <AlertTriangle className="size-5 text-red-500 shrink-0 animate-pulse" />
            Hapus Pekerja Secara Permanen
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Aksi destruktif tingkat Owner. Mengapus kredensial dan seluruh rekaman database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDelete} className="flex flex-col gap-4 py-2 text-xs">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 flex flex-col gap-1.5">
            <span className="font-extrabold uppercase tracking-wide text-red-300">PERINGATAN FATAL:</span>
            <p className="text-[11px] leading-relaxed">
              Aksi ini akan menghapus pekerja <strong className="text-foreground text-xs font-bold">{row.name}</strong> (`{row.email}`) dan <strong className="underline">SELURUH data historisnya</strong> (Tracker, Absensi, Daily Task, Records, SP) secara permanen melalui CASCADE deletion. Data yang terhapus <strong className="text-red-300 font-extrabold">TIDAK DAPAT DIKEMBALIKAN</strong>.
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="font-semibold text-muted-foreground leading-normal">
              Ketik nama pekerja <strong className="text-foreground font-extrabold">{row.name}</strong> di bawah untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={row.name}
              required
              autoComplete="off"
              className="w-full rounded-lg border border-red-500/30 bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            />
          </div>

          <DialogFooter className="mt-2 pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="h-9 px-4 font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="h-9 px-4 font-bold text-xs flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
