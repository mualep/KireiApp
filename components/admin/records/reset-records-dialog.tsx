"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetRecords } from "@/app/admin/(shell)/records/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type ResetRecordsDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  monthParam: string;
  monthLabel: string;
};

export function ResetRecordsDialog({
  isOpen,
  onOpenChange,
  monthParam,
  monthLabel,
}: ResetRecordsDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");

  const isConfirmed = confirmText === "RESET RECORDS";

  function handleOpenChange(open: boolean) {
    if (isPending) return;
    if (!open) {
      setConfirmText("");
    }
    onOpenChange(open);
  }

  function handleReset() {
    if (!isConfirmed) return;

    startTransition(async () => {
      try {
        const result = await resetRecords(monthParam);
        if (!result.ok) {
          toast({
            title: "Gagal",
            description: result.error ?? "Gagal mereset records.",
            variant: "error",
          });
          return;
        }

        toast({
          title: "Berhasil",
          description: `Semua record bulan ${monthLabel} telah di-reset.`,
          variant: "success",
        });
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast({
          title: "Gagal",
          description: "Terjadi kesalahan yang tidak terduga.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Records: {monthLabel}</DialogTitle>
          <DialogDescription>
            Tindakan ini akan meng-nol-kan seluruh data keterlambatan, alpha, izin, sakit, dan lembur untuk bulan {monthLabel}. Sisa cuti (*cuti stock*) worker akan tetap utuh.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            Untuk mengonfirmasi tindakan destruktif ini, ketik <strong className="text-foreground select-all">RESET RECORDS</strong> di bawah ini:
          </p>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-confirm-text">Konfirmasi Ketik</FieldLabel>
              <Input
                id="reset-confirm-text"
                type="text"
                placeholder="RESET RECORDS"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isPending}
                autoComplete="off"
              />
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!isConfirmed || isPending}
            onClick={handleReset}
          >
            {isPending ? "Mereset..." : "Reset Records"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
