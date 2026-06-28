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
import { workerRoles, workerShifts, workerShiftDefinitions } from "@/lib/workers/constants";

type EditWorkerDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: UsersManagerRowDTO;
};

export function EditWorkerDialog({ onOpenChange, open, row }: EditWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const payload = {
      cutiStock: Number(formData.get("cutiStock") || 0),
      employeeRole: formData.get("employeeRole"),
      gid: null,
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
      setError(res.error || "Unknown error occurred");
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

          {error && <div className="text-sm text-destructive font-medium">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <input name="name" defaultValue={row.name} placeholder="Name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
            <select name="tier" defaultValue={row.tier} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="member">MEMBER</option>
              <option value="admin">ADMIN</option>
              <option value="owner">OWNER</option>
            </select>

            <div className="col-span-1">
              <select name="employeeRole" defaultValue={row.employeeRole ?? ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="" disabled>Select Role</option>
                {workerRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <select name="shift" defaultValue={row.shift ?? ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="" disabled>Select Shift</option>
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

            <input name="cutiStock" type="number" defaultValue={0} placeholder="Cuti Stock" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFlexible" defaultChecked={false /* Not exposed in base row, just leave unchecked for now or extend API */} /> Flexible Shift?
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
