"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import {
  canStaffTierPerformTrackerAction,
  trackerActions,
  type TrackerAction,
} from "@/lib/workers/tracker-actions";

const applyTrackerActionSchema = z.object({
  action: z.enum(trackerActions),
  expectedVersion: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  targetUserId: z.string().uuid(),
});

export type ApplyTrackerActionInput = z.infer<typeof applyTrackerActionSchema>;

export type TrackerActionResultCode =
  | "success"
  | "invalid_input"
  | "unauthenticated"
  | "unauthorized"
  | "invalid_action"
  | "invalid_target"
  | "version_conflict"
  | "invalid_transition"
  | "alpha_rejected"
  | "attendance_conflict"
  | "attendance_missing"
  | "cuti_stock_exhausted"
  | "generic_error";

type TrackerActionErrorCode = Exclude<TrackerActionResultCode, "success">;

export type ApplyTrackerActionResult =
  | {
      action: TrackerAction;
      code: "success";
      message: string;
      ok: true;
      targetUserId: string;
    }
  | {
      code: TrackerActionErrorCode;
      fieldErrors?: Record<string, string[] | undefined>;
      message: string;
      ok: false;
    };

const RESULT_MESSAGES = {
  alpha_rejected: "Manual tracker actions are not allowed after ALPHA is set.",
  attendance_conflict: "Attendance already exists for this worker and date.",
  attendance_missing: "Attendance could not be found for this action.",
  cuti_stock_exhausted: "This worker has no remaining CUTI stock.",
  generic_error: "We could not apply that tracker action. Please try again.",
  invalid_action: "Choose a valid tracker action.",
  invalid_input: "Check the tracker action details and try again.",
  invalid_target: "Choose a valid worker target.",
  invalid_transition: "That tracker action is not allowed from the current status.",
  success: "Tracker action applied.",
  unauthenticated: "Sign in again to continue.",
  unauthorized: "You are not allowed to apply tracker actions.",
  version_conflict: "This tracker card changed. Refresh and try again.",
} as const satisfies Record<TrackerActionResultCode, string>;

const RPC_ERROR_CODES: Partial<Record<string, TrackerActionErrorCode>> = {
  "tracker.alpha_rejected": "alpha_rejected",
  "tracker.attendance_conflict": "attendance_conflict",
  "tracker.attendance_missing": "attendance_missing",
  "tracker.cuti_stock_exhausted": "cuti_stock_exhausted",
  "tracker.invalid_action": "invalid_action",
  "tracker.invalid_target": "invalid_target",
  "tracker.invalid_transition": "invalid_transition",
  "tracker.unauthenticated": "unauthenticated",
  "tracker.unauthorized": "unauthorized",
  "tracker.version_conflict": "version_conflict",
} as const satisfies Record<string, TrackerActionErrorCode>;

export async function applyTrackerAction(input: unknown): Promise<ApplyTrackerActionResult> {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    return actionError("unauthenticated");
  }

  if (!canStaffTierPerformTrackerAction(staff.profile.tier)) {
    return actionError("unauthorized");
  }

  const parsed = applyTrackerActionSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid_input", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_tracker_action", {
    p_action: parsed.data.action,
    p_expected_version: parsed.data.expectedVersion,
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return actionError(mapTrackerRpcError(error.message));
  }

  revalidatePath("/admin/tracker");

  return {
    action: parsed.data.action,
    code: "success",
    message: RESULT_MESSAGES.success,
    ok: true,
    targetUserId: parsed.data.targetUserId,
  };
}

function mapTrackerRpcError(message: string): TrackerActionErrorCode {
  return RPC_ERROR_CODES[message] ?? "generic_error";
}

function actionError(
  code: TrackerActionErrorCode,
  fieldErrors?: Record<string, string[] | undefined>,
): ApplyTrackerActionResult {
  return {
    code,
    fieldErrors,
    message: RESULT_MESSAGES[code],
    ok: false,
  };
}
