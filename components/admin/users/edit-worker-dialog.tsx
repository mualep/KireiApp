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
import { editWorker } from "@/app/admin/(shell)/users/actions";
import type { UsersManagerRowDTO } from "@/lib/users/data";

type EditWorkerDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function EditWorkerDialog({ onOpenChange, open, row }: EditWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      cutiStock: Number(formData.get("cutiStock") || 0),
      employeeRole: formData.get("employeeRole"),
      gid: formData.get("gid"),
      isFlexible: formData.get("isFlexible") === "on",
      name: formData.get("name"),
      shift: formData.get("shift"),
      tier: formData.get("tier"), 
    };

    const res = await editWorker(row.id, payload);
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
          <DialogTitle>Edit Worker: {row.name}</DialogTitle>
          <DialogDescription>
            Update worker profile details. If shift is changed, active shift trackers will be reset.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input name="name" defaultValue={row.name} placeholder="Name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="tier" defaultValue={row.tier} placeholder="Tier" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="gid" defaultValue={row.gid ?? ""} placeholder="GID" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="employeeRole" defaultValue={row.employeeRole ?? ""} placeholder="Role (e.g. Explorer)" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="shift" defaultValue={row.shift ?? ""} placeholder="Shift (e.g. A)" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="cutiStock" type="number" defaultValue={0} placeholder="Cuti Stock" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFlexible" /> Flexible Shift?
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
