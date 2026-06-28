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
import { deactivateWorker, reactivateWorker } from "@/app/admin/(shell)/users/actions";
import type { UsersManagerRowDTO } from "@/lib/users/data";
import { UserXIcon, UserPlusIcon } from "lucide-react";

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

    let res;
    if (isDeactivating) {
      res = await deactivateWorker(row.id);
    } else {
      res = await reactivateWorker(row.id);
    }

    setLoading(false);
    if (res.ok) {
      onOpenChange(false);
    } else {
      setError(res.error || "Unknown error occurred");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel">
        <DialogHeader>
          <DialogTitle className={isDeactivating ? "text-destructive" : ""}>
            {isDeactivating ? "Pecat / Nonaktifkan Worker" : "Reactivate Worker"}
          </DialogTitle>
          <DialogDescription>
            {isDeactivating
              ? `Anda yakin ingin memberhentikan ${row.name}? Mereka tidak akan bisa login atau menggunakan tracker lagi. Berdasarkan kebijakan KireiApp V1, data rekaman mereka akan tetap diarsipkan (soft-delete).`
              : `Anda yakin ingin mengaktifkan kembali ${row.name}? Mereka akan mendapatkan akses ke sistem lagi.`
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="text-sm text-destructive font-medium">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} variant={isDeactivating ? "destructive" : "default"}>
              {isDeactivating ? <><UserXIcon className="size-4 mr-2" /> Pecat</> : <><UserPlusIcon className="size-4 mr-2" /> Reactivate</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
