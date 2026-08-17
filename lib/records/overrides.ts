import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const applyRecordsOverrideSchema = z.object({
  targetUserId: z.string().uuid(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Must be the first day of the month"),
  fieldName: z.string(),
  beforeValue: z.number().min(0).nullable().optional(),
  afterValue: z.number().min(0).nullable().optional(),
  desiredValue: z.number().min(0).nullable().optional(),
  reason: z.string().trim().max(50).optional().nullable(),
});

export type ApplyRecordsOverrideInput = z.infer<typeof applyRecordsOverrideSchema>;

export async function applyRecordsOverrideMutation(input: unknown) {
  const parsed = applyRecordsOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payload.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const desiredValue = parsed.data.desiredValue ?? parsed.data.afterValue ?? null;

  const supabase = await createClient();

  const { error, data } = await supabase.rpc("apply_records_delta_override", {
    p_target_user_id: parsed.data.targetUserId,
    p_period_month: parsed.data.periodMonth,
    p_field_name: parsed.data.fieldName,
    p_desired_value: desiredValue,
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
