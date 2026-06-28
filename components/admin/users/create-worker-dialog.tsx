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
import { createWorker } from "@/app/admin/(shell)/users/actions";

type CreateWorkerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateWorkerDialog({ open, onOpenChange }: CreateWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Dummy submission logic for visual slice, full hook implementation later if needed
    // The requirement states tier must be strictly member by default
    const formData = new FormData(e.currentTarget);
    const payload = {
      cutiStock: Number(formData.get("cutiStock") || 0),
      email: formData.get("email"),
      employeeRole: formData.get("employeeRole"),
      gid: formData.get("gid"),
      isFlexible: formData.get("isFlexible") === "on",
      name: formData.get("name"),
      password: formData.get("password"),
      shift: formData.get("shift"),
      tier: "member", 
    };

    const res = await createWorker(payload);
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
          <DialogTitle>Add Worker</DialogTitle>
          <DialogDescription>
            Create a new worker account. The role will be set to Member automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="tier" value="member" />
          <div className="grid grid-cols-2 gap-4">
            <input name="name" placeholder="Name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="email" type="email" placeholder="Email" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="password" type="password" placeholder="Password" required minLength={6} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="gid" placeholder="GID" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="employeeRole" placeholder="Role (e.g. Explorer)" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="shift" placeholder="Shift (e.g. A)" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="cutiStock" type="number" defaultValue={0} placeholder="Cuti Stock" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFlexible" /> Flexible Shift?
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
