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
import { workerRoles, workerShifts, workerShiftDefinitions } from "@/lib/workers/constants";

type CreateWorkerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateWorkerDialog({ open, onOpenChange }: CreateWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      cutiStock: Number(formData.get("cutiStock") || 0),
      email: formData.get("email"),
      employeeRole: formData.get("employeeRole"),
      gid: null,
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
      setError(res.error || "Unknown error occurred");
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

          {error && <div className="text-sm text-destructive font-medium">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <input name="name" placeholder="Name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="email" type="email" placeholder="Email" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="password" type="password" placeholder="Password" required minLength={6} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <input name="cutiStock" type="number" defaultValue={0} placeholder="Cuti Stock" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />

            <div className="col-span-1">
              <select name="employeeRole" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="" disabled selected>Select Role</option>
                {workerRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <select name="shift" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="" disabled selected>Select Shift</option>
                {workerShifts.map((shift) => {
                  const def = workerShiftDefinitions[shift as keyof typeof workerShiftDefinitions];
                  if (!def) return <option key={shift} value={shift}>{shift}</option>;
                  if (def.isFlexible || def.startHour === null || def.endHour === null) {
                    return <option key={shift} value={shift}>{shift}</option>;
                  }
                  const startString = `${String(def.startHour).padStart(2, "0")}:${String(def.startMinute).padStart(2, "0")}`;
                  const endString = `${String(def.endHour).padStart(2, "0")}:${String(def.endMinute).padStart(2, "0")}`;
                  return <option key={shift} value={shift}>{shift} ({startString}-{endString})</option>;
                })}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm col-span-2">
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
