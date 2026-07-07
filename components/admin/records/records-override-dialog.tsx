"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RecordsRowDTO } from "@/lib/records/data";
import { formatRecordsDuration, formatRecordsNumber } from "@/lib/records/helpers";
import { useToast } from "@/components/ui/use-toast";

const overrideFieldOptions = [
  { value: "work_late_override_seconds", label: "Work Late", isDuration: true },
  { value: "break_late_override_seconds", label: "Break Late", isDuration: true },
  { value: "alpha_override_count", label: "Alpha Count", isDuration: false },
  { value: "sakit_override_days", label: "Sakit Days", isDuration: false },
  { value: "pending_override_days", label: "Pending Days", isDuration: false },
  { value: "lembur_override_units", label: "Lembur Units", isDuration: false },
  { value: "cuti_stock_override_snapshot", label: "Cuti Stock", isDuration: false },
] as const;

type OverrideFieldName = typeof overrideFieldOptions[number]["value"];

export type RecordsOverrideDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  row: RecordsRowDTO;
  periodMonth: string;
  onSuccess?: () => void;
};

function getMetricForField(row: RecordsRowDTO, field: OverrideFieldName) {
  switch (field) {
    case "work_late_override_seconds":
      return row.workLateSeconds;
    case "break_late_override_seconds":
      return row.breakLateSeconds;
    case "alpha_override_count":
      return row.alphaCount;
    case "sakit_override_days":
      return row.sakitDays;
    case "pending_override_days":
      return row.pendingDays;
    case "lembur_override_units":
      return row.lemburUnits;
    case "cuti_stock_override_snapshot":
      return row.cutiStockSnapshot;
  }
}

function isDurationField(field: OverrideFieldName): boolean {
  return overrideFieldOptions.find((o) => o.value === field)?.isDuration ?? false;
}

function formatCurrentValue(field: OverrideFieldName, value: number | null): string {
  if (value === null) return "-";
  if (isDurationField(field)) return formatRecordsDuration(value);
  return formatRecordsNumber(value);
}

export function RecordsOverrideDialog({
  isOpen,
  onOpenChange,
  row,
  periodMonth,
  onSuccess,
}: RecordsOverrideDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [fieldName, setFieldName] = useState<OverrideFieldName>("work_late_override_seconds");
  // Duration fields: separate hour/minute inputs (0 minutes = 0 seconds)
  const [afterHours, setAfterHours] = useState("");
  const [afterMinutes, setAfterMinutes] = useState("");
    // Number fields: single input
  const [afterValueStr, setAfterValueStr] = useState("");
  const [reason, setReason] = useState("");

  const reasonLength = reason.trim().length;
  const metric = getMetricForField(row, fieldName);
  const isDuration = isDurationField(fieldName);
  const currentDisplayValue = formatCurrentValue(fieldName, metric.value);

  // beforeValue: existing override value, or null if auto-aggregated
  const beforeValue: number | null = metric.isOverride ? metric.value : null;

  // Compute afterValue in the correct unit (seconds for duration, plain int otherwise)
  const afterValue: number | null = (() => {
    if (isDuration) {
      const h = afterHours === "" ? null : Number(afterHours);
      const m = afterMinutes === "" ? null : Number(afterMinutes);
      if (h === null && m === null) return null;
      return ((h ?? 0) * 3600) + ((m ?? 0) * 60);
    }
    return afterValueStr === "" ? null : Number(afterValueStr);
  })();

  const isAfterEmpty = isDuration
    ? afterHours === "" && afterMinutes === ""
    : afterValueStr === "";

  const isAfterSameAsBefore = !isAfterEmpty && afterValue === beforeValue;
  const isSaveDisabled = isPending || isAfterEmpty || isAfterSameAsBefore || reasonLength > 20;

  function resetNewValue() {
    setAfterHours("");
    setAfterMinutes("");
    setAfterValueStr("");
  }

  function handleFieldChange(newField: OverrideFieldName) {
    setFieldName(newField);
    resetNewValue();
  }

  function handleOpenChange(open: boolean) {
    if (isPending) return;
    if (!open) {
      setFieldName("work_late_override_seconds");
      resetNewValue();
      setReason("");
    }
    onOpenChange(open);
  }

  function submitOverride(
    overrideAfterValue: number | null,
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (reasonLength > 20) {
      toast({
        title: "Gagal",
        description: "Alasan harus berisi 20 karakter atau kurang.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/records/override", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: row.userId,
            period_month: `${periodMonth}-01`,
            field_name: fieldName,
            desired_value: overrideAfterValue,
            reason: reason.trim() || null,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast({
            title: "Gagal",
            description: result.error ?? "Terjadi kesalahan saat memproses permintaan.",
            variant: "error",
          });
          return;
        }

        toast({
          title: "Berhasil",
          description: overrideAfterValue === null ? "Override dihapus." : "Record berhasil diperbarui.",
          variant: "success",
        });
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
          onOpenChange(false);
        }
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="tracker-glass-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Record</DialogTitle>
          <DialogDescription>
            Updating record for <span className="font-semibold">{row.name}</span>.
          </DialogDescription>
        </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => submitOverride(afterValue, e)}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="override-field">Field</FieldLabel>
                <Select
                  id="override-field"
                  name="fieldName"
                  value={fieldName}
                  onChange={(e) => handleFieldChange(e.target.value as OverrideFieldName)}
                  disabled={isPending}
                >
                  {overrideFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Current Value — strictly read-only display */}
              <Field>
                <FieldLabel htmlFor="override-before">Current Value</FieldLabel>
                <Input
                  id="override-before"
                  readOnly
                  type="text"
                  value={currentDisplayValue}
                  className="select-none"
                  aria-label="Current value (read-only)"
                />
              </Field>

              {/* New Value — duration: H + M inputs; number: single input */}
              {isDuration ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="override-after-h">Hours</FieldLabel>
                    <Input
                      id="override-after-h"
                      name="afterHours"
                      type="number"
                      min={0}
                      step={1}
                      value={afterHours}
                      onChange={(e) => setAfterHours(e.target.value)}
                      disabled={isPending}
                      placeholder="0"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="override-after-m">Minutes</FieldLabel>
                    <Input
                      id="override-after-m"
                      name="afterMinutes"
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      value={afterMinutes}
                      onChange={(e) => setAfterMinutes(e.target.value)}
                      disabled={isPending}
                      placeholder="0"
                    />
                  </Field>
                </div>
              ) : (
                <Field data-invalid={isAfterSameAsBefore ? true : undefined}>
                  <FieldLabel htmlFor="override-after">New Value</FieldLabel>
                  <Input
                    id="override-after"
                    name="afterValue"
                    type="number"
                    min={0}
                    step={1}
                    value={afterValueStr}
                    onChange={(e) => setAfterValueStr(e.target.value)}
                    disabled={isPending}
                    placeholder="Enter value"
                    aria-invalid={isAfterSameAsBefore ? true : undefined}
                  />
                  {isAfterSameAsBefore ? (
                    <FieldError>New value must differ from current override.</FieldError>
                  ) : null}
                </Field>
              )}

              <Field data-invalid={reasonLength > 20 ? true : undefined}>
                <FieldLabel htmlFor="override-reason">
                  Reason <span className="text-muted-foreground">(Optional)</span>
                </FieldLabel>
                <Textarea
                  id="override-reason"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                  maxLength={20}
                  autoComplete="off"
                  placeholder="Optional note"
                  className="resize-none"
                  aria-invalid={reasonLength > 20 ? true : undefined}
                />
                <FieldDescription>{reasonLength}/20 optional</FieldDescription>
                {reasonLength > 20 ? (
                  <FieldError>Reason must be 20 characters or fewer.</FieldError>
                ) : null}
              </Field>
            </FieldGroup>

            <DialogFooter className="gap-2 sm:gap-0">
              {metric.isOverride ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => submitOverride(null)}
                  className="mr-auto"
                >
                  Batal Override (Kembali Otomatis)
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
