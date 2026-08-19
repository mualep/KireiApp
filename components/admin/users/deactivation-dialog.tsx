"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserXIcon, UserPlusIcon } from "lucide-react";
import { deactivateWorker, reactivateWorker } from "@/app/admin/(shell)/users/actions";
import type { UsersManagerRowDTO } from "@/lib/users/data";

type DeactivationDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function DeactivationDialog({ onOpenChange, open, row }: DeactivationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeactivating = !row.isDeleted;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = isDeactivating
      ? await deactivateWorker(row.id)
      : await reactivateWorker(row.id);

    setLoading(false);
    if (res.ok) {
      onOpenChange(false);
    } else {
      setError(res.error ?? "Terjadi kesalahan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel">
        <DialogHeader>
          <DialogTitle>
            {isDeactivating ? "Nonaktifkan Pekerja" : "Aktifkan Kembali Pekerja"}
          </DialogTitle>
          <DialogDescription className="mt-2">
            {isDeactivating ? (
              <>
                Anda yakin ingin menonaktifkan pekerja{" "}
                <strong className="text-foreground">{row.name}</strong>? Pekerja ini tidak akan
                bisa login atau menggunakan tracker lagi.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Catatan: Seluruh data historis operasional tetap diarsipkan secara utuh di database.
                </span>
              </>
            ) : (
              <>
                Anda yakin ingin mengaktifkan kembali pekerja{" "}
                <strong className="text-foreground">{row.name}</strong>? Pekerja ini akan mendapatkan
                akses ke sistem kembali.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          {error && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="default"
            >
              {isDeactivating ? (
                <>
                  <UserXIcon className="size-4 mr-1.5" />
                  {loading ? "Memproses…" : "Ya, Nonaktifkan"}
                </>
              ) : (
                <>
                  <UserPlusIcon className="size-4 mr-1.5" />
                  {loading ? "Memproses…" : "Ya, Aktifkan Kembali"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
