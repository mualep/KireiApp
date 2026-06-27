import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const applyRecordsOverrideSchema = z.object({
  targetUserId: z.string().uuid(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Must be the first day of the month"),
  fieldName: z.enum([
    "work_late_override_seconds",
    "break_late_override_seconds",
    "alpha_override_count",
    "sakit_override_days",
    "pending_override_days",
    "lembur_override_units",
    "cuti_stock_override_snapshot",
  ]),
  beforeValue: z.number().int().min(0).nullable(),
  afterValue: z.number().int().min(0).nullable(),
  reason: z.string().trim().max(20).optional(),
}).refine(
  (data) => data.beforeValue !== data.afterValue,
  {
    message: "New value must be different from current value",
    path: ["afterValue"],
  }
);

export type ApplyRecordsOverrideInput = z.infer<typeof applyRecordsOverrideSchema>;

export async function applyRecordsOverrideMutation(input: unknown) {
  const parsed = applyRecordsOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payload.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.rpc("apply_records_override", {
    p_target_user_id: parsed.data.targetUserId,
    p_period_month: parsed.data.periodMonth,
    p_field_name: parsed.data.fieldName,
    p_before_value: parsed.data.beforeValue,
    p_after_value: parsed.data.afterValue,
    p_reason: parsed.data.reason ?? null,
  });

  if (error) {
    return { ok: false, error: mapRecordsRpcError(error.message) };
  }

  return { ok: true, data };
}

function mapRecordsRpcError(message: string): string {
  switch (message) {
    case "records.unauthenticated":
      return "You must be logged in.";
    case "records.unauthorized":
      return "You do not have permission to override records.";
    case "records.invalid_input":
    case "records.invalid_value":
      return "Invalid override value or reason.";
    case "records.invalid_target":
      return "Selected worker is invalid, hidden, or deleted.";
    case "records.stale_override":
      return "The record has been updated by someone else. Please refresh and try again.";
    default:
      return "An unexpected error occurred while saving the override.";
  }
}
