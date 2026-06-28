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

type DeactivationDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function DeactivationDialog({ onOpenChange, open, row }: DeactivationDialogProps) {
  const [loading, setLoading] = useState(false);
  const isDeactivating = !row.isDeleted;
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
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
      alert(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel">
        <DialogHeader>
          <DialogTitle>
            {isDeactivating ? "Deactivate Worker" : "Reactivate Worker"}
          </DialogTitle>
          <DialogDescription>
            {isDeactivating 
              ? `Are you sure you want to deactivate ${row.name}? They will no longer be able to log in or use the tracker. No records will be deleted.`
              : `Are you sure you want to reactivate ${row.name}? They will regain access to the system.`
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} variant={isDeactivating ? "destructive" : "default"}>
              {isDeactivating ? "Yes, Deactivate" : "Yes, Reactivate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
