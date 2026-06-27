"use client";

import type { FormEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { applyRecordsOverride } from "@/app/admin/(shell)/records/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const overrideFieldOptions = [
  { value: "work_late_override_seconds", label: "Work Late (Seconds)" },
  { value: "break_late_override_seconds", label: "Break Late (Seconds)" },
  { value: "alpha_override_count", label: "Alpha Count" },
  { value: "sakit_override_days", label: "Sakit Days" },
  { value: "pending_override_days", label: "Pending Days" },
  { value: "lembur_override_units", label: "Lembur Units" },
  { value: "cuti_stock_override_snapshot", label: "Cuti Stock" },
] as const;

type OverrideFieldName = typeof overrideFieldOptions[number]["value"];

export type RecordsOverrideDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName: string;
  periodMonth: string;
};

export function RecordsOverrideDialog({
  isOpen,
  onOpenChange,
  targetUserId,
  targetName,
  periodMonth,
}: RecordsOverrideDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [fieldName, setFieldName] = useState<OverrideFieldName>("work_late_override_seconds");
  const [beforeValueStr, setBeforeValueStr] = useState("0");
  const [afterValueStr, setAfterValueStr] = useState("");
  const [reason, setReason] = useState("");

  const reasonLength = reason.trim().length;

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const closeTimer = window.setTimeout(() => {
      onOpenChange(false);
      router.refresh();
    }, 1500);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [onOpenChange, successMessage, router]);

  function handleOpenChange(open: boolean) {
    if (isPending) return;
    if (!open) {
      setSuccessMessage(null);
      setGlobalError(null);
      setFieldName("work_late_override_seconds");
      setBeforeValueStr("0");
      setAfterValueStr("");
      setReason("");
    }
    onOpenChange(open);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGlobalError(null);
    setSuccessMessage(null);

    if (reasonLength > 20) {
      setGlobalError("Reason must be 20 characters or fewer.");
      return;
    }

    const beforeValue = beforeValueStr ? Number(beforeValueStr) : null;
    const afterValue = afterValueStr ? Number(afterValueStr) : null;

    if (beforeValue === afterValue) {
      setGlobalError("New value must be different from current value.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await applyRecordsOverride({
          targetUserId,
          periodMonth,
          fieldName,
          beforeValue,
          afterValue,
          reason: reason.trim() || undefined,
        });

        if (!result.ok) {
          setGlobalError(result.error ?? "An error occurred");
          return;
        }

        setSuccessMessage("Record updated successfully");
      } catch {
        setGlobalError("An unexpected error occurred.");
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override Record</DialogTitle>
          <DialogDescription>
            Modify record for <span className="font-semibold">{targetName}</span>.
          </DialogDescription>
        </DialogHeader>

        {globalError ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Update Failed</AlertTitle>
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert className="border-status-on/30 bg-status-on/10 text-status-on shadow-sm shadow-status-on/10">
            <CheckIcon aria-hidden="true" />
            <AlertTitle>{successMessage}</AlertTitle>
            <AlertDescription className="text-status-on/85">
              The Records page will use the refreshed server data.
            </AlertDescription>
          </Alert>
        ) : null}

        {!successMessage ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="override-field">Field to Override</FieldLabel>
                <Select
                  id="override-field"
                  name="fieldName"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value as OverrideFieldName)}
                  disabled={isPending}
                >
                  {overrideFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="override-before">Current Value</FieldLabel>
                  <Input
                    id="override-before"
                    name="beforeValue"
                    type="number"
                    value={beforeValueStr}
                    onChange={(e) => setBeforeValueStr(e.target.value)}
                    disabled={isPending}
                  />
                </Field>

                <Field data-invalid={beforeValueStr === afterValueStr ? true : undefined}>
                  <FieldLabel htmlFor="override-after">New Value</FieldLabel>
                  <Input
                    id="override-after"
                    name="afterValue"
                    type="number"
                    value={afterValueStr}
                    onChange={(e) => setAfterValueStr(e.target.value)}
                    disabled={isPending}
                    aria-invalid={beforeValueStr === afterValueStr ? true : undefined}
                  />
                </Field>
              </div>

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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || beforeValueStr === afterValueStr}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
