"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { updateOwnCredentials } from "@/app/admin/(shell)/profile/actions";

type UpdateCredentialsFormProps = {
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

export function UpdateCredentialsForm({ currentEmail }: UpdateCredentialsFormProps) {
  const { toast } = useToast();
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
          // Clear password input manually
          const form = e.target as HTMLFormElement;
          const pwInput = form.querySelector("#newPassword") as HTMLInputElement;
          if (pwInput) pwInput.value = "";
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
    <Card className="tracker-glass-panel rounded-xl border">
      <CardHeader>
        <CardTitle>Perbarui Kredensial</CardTitle>
        <CardDescription>
          Perbarui alamat email login (prefix saja) dan password Anda. Domain email bersifat permanen (@kireiku.app).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive font-semibold">
              {error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
