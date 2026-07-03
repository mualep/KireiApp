"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { updateOwnCredentials } from "@/app/admin/(shell)/profile/actions";
import { PencilIcon } from "lucide-react";

type UpdateCredentialsDialogProps = {
  currentEmail: string;
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider"
    >
      {children}
    </label>
  );
}

export function UpdateCredentialsDialog({ currentEmail }: UpdateCredentialsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Extract prefix before "@" from current email
  const defaultPrefix = currentEmail.split("@")[0] || "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const emailPrefix = (fd.get("emailPrefix") as string) || "";
    const newPassword = (fd.get("newPassword") as string) || "";

    // Simple frontend validation for prefix characters
    if (!emailPrefix.trim()) {
      setError("Prefix email tidak boleh kosong");
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(emailPrefix)) {
      setError("Prefix email hanya boleh berisi huruf, angka, titik, strip, atau underscore");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateOwnCredentials({
          emailPrefix,
          newPassword,
        });

        if (res.ok) {
          toast({
            title: "Berhasil",
            description: "Kredensial profil berhasil diperbarui.",
            variant: "success",
          });
          setOpen(false);
        } else {
          setError(res.error || "Gagal memperbarui kredensial.");
          toast({
            title: "Gagal",
            description: res.error || "Gagal memperbarui kredensial.",
            variant: "error",
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errMsg);
        toast({
          title: "Gagal",
          description: errMsg,
          variant: "error",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 font-bold tracker-glass-panel">
          <PencilIcon className="size-4" />
          Edit Profil
        </Button>
      </DialogTrigger>
      <DialogContent className="tracker-glass-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perbarui Kredensial</DialogTitle>
          <DialogDescription>
            Perbarui alamat email login (prefix saja) dan password Anda. Domain email bersifat permanen (@kireiku.app).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
          {error && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive font-semibold">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel htmlFor="emailPrefix">Prefix Email</FieldLabel>
              <div className="flex rounded-md border border-border bg-background/35 focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring transition-colors overflow-hidden">
                <input
                  id="emailPrefix"
                  name="emailPrefix"
                  type="text"
                  defaultValue={defaultPrefix}
                  required
                  placeholder="username"
                  className="flex-1 min-w-0 h-10 bg-transparent px-3 py-2 text-sm outline-none text-foreground"
                />
                <div className="flex h-10 items-center bg-muted/25 border-l border-border px-3 text-sm font-bold text-muted-foreground select-none">
                  @kireiku.app
                </div>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="newPassword">Password Baru (opsional)</FieldLabel>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Kosongkan jika tidak diubah"
                minLength={6}
                className="flex h-10 w-full rounded-md border border-border bg-background/35 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
