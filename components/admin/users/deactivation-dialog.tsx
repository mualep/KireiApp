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
          <DialogTitle className={isDeactivating ? "text-destructive" : ""}>
            {isDeactivating ? "Pecat / Nonaktifkan Worker" : "Aktifkan Kembali Worker"}
          </DialogTitle>
          <DialogDescription className="mt-2">
            {isDeactivating ? (
              <>
                Anda yakin ingin memberhentikan{" "}
                <strong className="text-foreground">{row.name}</strong>? Mereka tidak akan
                bisa login atau menggunakan tracker lagi.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Catatan: Data rekaman tetap diarsipkan (soft-delete, sesuai kebijakan KireiApp V1).
                </span>
              </>
            ) : (
              <>
                Anda yakin ingin mengaktifkan kembali{" "}
                <strong className="text-foreground">{row.name}</strong>? Mereka akan mendapatkan
                akses ke sistem lagi.
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
              variant={isDeactivating ? "destructive" : "default"}
            >
              {isDeactivating ? (
                <>
                  <UserXIcon className="size-4 mr-1.5" />
                  {loading ? "Memproses…" : "Ya, Pecat"}
                </>
              ) : (
                <>
                  <UserPlusIcon className="size-4 mr-1.5" />
                  {loading ? "Memproses…" : "Ya, Aktifkan"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
