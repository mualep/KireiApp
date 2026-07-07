"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type CorrectionAfterStatus = "hadir" | "cuti" | "sakit" | "pending" | "alpha";
type CorrectionBeforeStatus = "none" | CorrectionAfterStatus;

export type AbsensiCorrectionDraft = {
  attendanceDate: string;
  beforeLabel: string;
  beforeStatus: CorrectionBeforeStatus;
  expectedAttendanceId: string | null;
  expectedAttendanceUpdatedAt: string | null;
  targetUserId: string;
  workerGid: string;
  workerName: string;
};

type AbsensiCorrectionDialogProps = {
  correction: AbsensiCorrectionDraft | null;
  onOpenChange: (open: boolean) => void;
};

const correctionStatuses: Array<{
  label: string;
  value: CorrectionAfterStatus;
}> = [
  { label: "HADIR", value: "hadir" },
  { label: "CUTI", value: "cuti" },
  { label: "SAKIT", value: "sakit" },
  { label: "PENDING", value: "pending" },
  { label: "ALPHA", value: "alpha" },
];

const actionErrorMessages: Record<string, string> = {
  attendance_conflict: "Attendance changed. Refresh and try again.",
  cuti_stock_exhausted: "This worker has no remaining CUTI stock.",
  generic_error: "Correction failed. Please try again.",
  invalid_date: "Only historical dates can be corrected.",
  invalid_input: "Check the correction form.",
  invalid_target: "Worker cannot be corrected.",
  invalid_transition: "That correction is not available in v1.",
  records_missing: "Records could not be updated safely.",
  unauthenticated: "Session expired. Please sign in again.",
  unauthorized: "You are not allowed to correct Absensi.",
};

export function AbsensiCorrectionDialog({
  correction,
  onOpenChange,
}: AbsensiCorrectionDialogProps) {
  return (
    <Dialog open={Boolean(correction)} onOpenChange={onOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct Absensi</DialogTitle>
          <DialogDescription>
            Historical correction for an active Absensi day.
          </DialogDescription>
        </DialogHeader>

        {correction ? (
          <AbsensiCorrectionForm
            key={[
              correction.targetUserId,
              correction.attendanceDate,
              correction.expectedAttendanceId ?? "none",
            ].join(":")}
            correction={correction}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AbsensiCorrectionForm({
  correction,
  onOpenChange,
}: {
  correction: AbsensiCorrectionDraft;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [afterStatus, setAfterStatus] = useState<CorrectionAfterStatus>(() =>
    getDefaultAfterStatus(correction.beforeStatus),
  );
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const availableStatuses = useMemo(
    () =>
      correctionStatuses.filter((status) => status.value !== correction.beforeStatus),
    [correction.beforeStatus],
  );
  const selected = {
    ...correction,
    afterStatus,
  };
  const reasonLength = reason.trim().length;
  const isSameStatus = selected.afterStatus === selected.beforeStatus;
  const isSubmitDisabled =
    isPending ||
    isSameStatus ||
    reasonLength > 20;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedReason = reason.trim();

    if (trimmedReason.length > 20) {
      toast({
        title: "Gagal",
        description: "Alasan harus berisi 20 karakter atau kurang.",
        variant: "error",
      });
      return;
    }

    if (selected.afterStatus === selected.beforeStatus) {
      toast({
        title: "Gagal",
        description: "Pilih status yang berbeda.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/absensi/cell", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: selected.targetUserId,
            date: selected.attendanceDate,
            status: selected.afterStatus,
            notes: trimmedReason || null,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast({
            title: "Gagal",
            description: result.error ? (actionErrorMessages[result.error] ?? result.error) : actionErrorMessages.generic_error,
            variant: "error",
          });
          return;
        }

        toast({
          title: "Berhasil",
          description: "Koreksi absensi berhasil diterapkan.",
          variant: "success",
        });
        setReason("");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast({
          title: "Gagal",
          description: "Terjadi kesalahan yang tidak terduga.",
          variant: "error",
        });
      }
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/35 p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold" translate="no">
            {selected.workerName}
          </span>
          <Badge variant="outline" className="font-mono" translate="no">
            {selected.workerGid}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>
            Date{" "}
            <strong className="font-mono text-foreground" translate="no">
              {selected.attendanceDate}
            </strong>
          </span>
          <span>
            Current{" "}
            <strong className="text-foreground" translate="no">
              {selected.beforeLabel}
            </strong>
          </span>
        </div>
      </div>

      <FieldGroup>
        <Field data-invalid={isSameStatus ? true : undefined}>
          <FieldLabel htmlFor="absensi-after-status">After status</FieldLabel>
          <Select
            id="absensi-after-status"
            name="afterStatus"
            value={afterStatus}
            onChange={(event) =>
              setAfterStatus(event.target.value as CorrectionAfterStatus)
            }
            disabled={isPending}
            autoComplete="off"
            aria-invalid={isSameStatus ? true : undefined}
          >
            {availableStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          {isSameStatus ? (
            <FieldError>Choose a different status.</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={reasonLength > 20 ? true : undefined}>
          <FieldLabel htmlFor="absensi-correction-reason">Reason</FieldLabel>
          <Textarea
            id="absensi-correction-reason"
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isPending}
            maxLength={20}
            autoComplete="off"
            aria-invalid={reasonLength > 20 ? true : undefined}
            placeholder="Optional note"
            className="max-h-36 resize-none"
          />
          <FieldDescription>{reasonLength}/20 optional</FieldDescription>
          {reasonLength > 20 ? (
            <FieldError>Reason must be 20 characters or fewer.</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {isPending ? "Submitting…" : "Submit Correction"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function getDefaultAfterStatus(
  beforeStatus: CorrectionBeforeStatus,
): CorrectionAfterStatus {
  return (
    correctionStatuses.find((status) => status.value !== beforeStatus)?.value ??
    "hadir"
  );
}
