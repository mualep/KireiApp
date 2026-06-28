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
  onOpenChange: (open: boolean) => void;
  open: boolean;
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

export function CreateWorkerDialog({ open, onOpenChange }: CreateWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      cutiStock: Number(fd.get("cutiStock") ?? 0),
      email: fd.get("email"),
      employeeRole: fd.get("employeeRole"),
      name: fd.get("name"),
      password: fd.get("password"),
      shift: fd.get("shift"),
      tier: "member",
    };

    const res = await createWorker(payload);
    setLoading(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      onOpenChange(false);
    } else {
      setError(res.error ?? "Terjadi kesalahan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Worker</DialogTitle>
          <DialogDescription>
            Buat akun worker baru. Tier akan otomatis diatur ke <strong>Member</strong>.
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
              <FieldLabel htmlFor="cw-name">Nama Lengkap</FieldLabel>
              <input id="cw-name" name="name" placeholder="Nama lengkap" required className={inputCls()} />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="cw-email">Email</FieldLabel>
              <input id="cw-email" name="email" type="email" placeholder="worker@email.com" required className={inputCls()} />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="cw-password">Password</FieldLabel>
              <input id="cw-password" name="password" type="password" placeholder="Min. 6 karakter" required minLength={6} className={inputCls()} />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="cw-cuti">Saldo Cuti (hari)</FieldLabel>
              <input id="cw-cuti" name="cutiStock" type="number" defaultValue={0} min={0} required className={inputCls()} />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="cw-role">Role</FieldLabel>
              <select id="cw-role" name="employeeRole" defaultValue="" required className={selectCls()}>
                <option value="" disabled>Pilih Role</option>
                {workerRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="cw-shift">Shift</FieldLabel>
              <select id="cw-shift" name="shift" defaultValue="" required className={selectCls()}>
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
              {loading ? "Membuat…" : "Buat Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
