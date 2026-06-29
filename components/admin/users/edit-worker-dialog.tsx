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

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-muted-foreground mb-1"
    >
      {children}
    </label>
  );
}

function inputCls() {
  return "flex h-10 w-full rounded-md border border-input bg-background/55 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
}

function selectCls() {
  return "flex h-10 w-full rounded-md border border-input bg-background/55 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
}

function shiftLabel(shift: string): string {
  const def = workerShiftDefinitions[shift as keyof typeof workerShiftDefinitions];
  if (!def || def.isFlexible || def.startHour === null || def.endHour === null) return shift;
  const s = `${String(def.startHour).padStart(2, "0")}:${String(def.startMinute).padStart(2, "0")}`;
  const e = `${String(def.endHour).padStart(2, "0")}:${String(def.endMinute).padStart(2, "0")}`;
  return `${shift} (${s}–${e})`;
}

export function EditWorkerDialog({ onOpenChange, open, row }: EditWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const newPassword = (fd.get("newPassword") as string) ?? "";
    const payload = {
      email: (fd.get("email") as string) || undefined,
      employeeRole: fd.get("employeeRole"),
      name: fd.get("name"),
      newPassword: newPassword || undefined,
      shift: fd.get("shift"),
    };

    const res = await editWorker(row.id, payload);
    setLoading(false);
    if (res.ok) {
      onOpenChange(false);
    } else {
      setError(res.error ?? "Terjadi kesalahan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Worker: {row.name}</DialogTitle>
          <DialogDescription>
            Perbarui data worker. Kosongkan password baru jika tidak ingin mengubahnya.
            Perubahan Shift akan mereset status shift aktif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-1">
          {error && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="ew-name">Nama Lengkap</FieldLabel>
              <input
                id="ew-name"
                name="name"
                defaultValue={row.name}
                placeholder="Nama lengkap"
                required
                className={inputCls()}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="ew-email">Email (opsional, ubah jika perlu)</FieldLabel>
              <input
                id="ew-email"
                name="email"
                type="email"
                defaultValue={row.email}
                placeholder="Email baru"
                className={inputCls()}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="ew-password">Password Baru (opsional)</FieldLabel>
              <input
                id="ew-password"
                name="newPassword"
                type="password"
                placeholder="Kosongkan jika tidak diubah"
                minLength={6}
                className={inputCls()}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="ew-role">Role</FieldLabel>
              <select
                id="ew-role"
                name="employeeRole"
                defaultValue={row.employeeRole ?? ""}
                required
                className={selectCls()}
              >
                <option value="" disabled>Pilih Role</option>
                {workerRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="ew-shift">Shift</FieldLabel>
              <select
                id="ew-shift"
                name="shift"
                defaultValue={row.shift ?? ""}
                required
                className={selectCls()}
              >
                <option value="" disabled>Pilih Shift</option>
                {workerShifts.map((shift) => (
                  <option key={shift} value={shift}>{shiftLabel(shift)}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan…" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
