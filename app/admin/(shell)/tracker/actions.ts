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
import {
  trackerExpiredAbsenceCloseActions,
  type TrackerExpiredAbsenceCloseAction,
} from "@/lib/workers/tracker-absence-close";
import {
  trackerCorrectionActions,
  type TrackerCorrectionAction,
} from "@/lib/workers/tracker-corrections";

const applyTrackerActionSchema = z.object({
  action: z.enum(trackerActions),
  expectedVersion: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  targetUserId: z.string().uuid(),
});

const applyTrackerCorrectionSchema = z.object({
  action: z.enum(trackerCorrectionActions),
  attendanceId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  reason: z.string().trim().min(1).max(500),
  targetUserId: z.string().uuid(),
});

const applyTrackerExpiredAbsenceCloseSchema = z.object({
  action: z.enum(trackerExpiredAbsenceCloseActions),
  attendanceId: z.string().uuid().nullable(),
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
  | "invalid_correction_action"
  | "invalid_correction_input"
  | "invalid_target"
  | "version_conflict"
  | "invalid_transition"
  | "alpha_rejected"
  | "attendance_conflict"
  | "attendance_missing"
  | "absence_close_not_expired"
  | "correction_expired"
  | "cuti_stock_exhausted"
  | "generic_error"
  | "records_missing";

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

export type ApplyTrackerCorrectionResult =
  | {
      action: TrackerCorrectionAction;
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

export type ApplyTrackerExpiredAbsenceCloseResult =
  | {
      action: TrackerExpiredAbsenceCloseAction;
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
  absence_close_not_expired: "This tracker status can still be canceled before expiry.",
  alpha_rejected: "Manual tracker actions are not allowed after ALPHA is set.",
  attendance_conflict: "Attendance already exists for this worker and date.",
  attendance_missing: "Attendance could not be found for this action.",
  correction_expired: "This tracker correction is no longer available after shift end.",
  cuti_stock_exhausted: "This worker has no remaining CUTI stock.",
  generic_error: "We could not apply that tracker action. Please try again.",
  invalid_action: "Choose a valid tracker action.",
  invalid_correction_action: "Choose a valid tracker correction.",
  invalid_correction_input: "Add a reason and choose a valid attendance entry.",
  invalid_input: "Check the tracker action details and try again.",
  invalid_target: "Choose a valid worker target.",
  invalid_transition: "That tracker action is not allowed from the current status.",
  records_missing: "Tracker records could not be reversed safely.",
  success: "Tracker action applied.",
  unauthenticated: "Sign in again to continue.",
  unauthorized: "You are not allowed to apply tracker actions.",
  version_conflict: "This tracker card changed. Refresh and try again.",
} as const satisfies Record<TrackerActionResultCode, string>;

const RPC_ERROR_CODES: Partial<Record<string, TrackerActionErrorCode>> = {
  "tracker.alpha_rejected": "alpha_rejected",
  "tracker.attendance_conflict": "attendance_conflict",
  "tracker.attendance_missing": "attendance_missing",
  "tracker.absence_close_not_expired": "absence_close_not_expired",
  "tracker.correction_expired": "correction_expired",
  "tracker.cuti_stock_exhausted": "cuti_stock_exhausted",
  "tracker.invalid_action": "invalid_action",
  "tracker.invalid_correction_action": "invalid_correction_action",
  "tracker.invalid_correction_input": "invalid_correction_input",
  "tracker.invalid_target": "invalid_target",
  "tracker.invalid_transition": "invalid_transition",
  "tracker.records_missing": "records_missing",
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

export async function applyTrackerCorrection(
  input: unknown,
): Promise<ApplyTrackerCorrectionResult> {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    return actionError("unauthenticated");
  }

  if (!canStaffTierPerformTrackerAction(staff.profile.tier)) {
    return actionError("unauthorized");
  }

  const parsed = applyTrackerCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid_correction_input", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_tracker_correction", {
    p_attendance_id: parsed.data.attendanceId,
    p_correction_action: parsed.data.action,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return actionError(mapTrackerRpcError(error.message));
  }

  revalidatePath("/admin/tracker");

  return {
    action: parsed.data.action,
    code: "success",
    message: "Tracker correction applied.",
    ok: true,
    targetUserId: parsed.data.targetUserId,
  };
}

export async function applyTrackerExpiredAbsenceClose(
  input: unknown,
): Promise<ApplyTrackerExpiredAbsenceCloseResult> {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    return actionError("unauthenticated");
  }

  if (!canStaffTierPerformTrackerAction(staff.profile.tier)) {
    return actionError("unauthorized");
  }

  const parsed = applyTrackerExpiredAbsenceCloseSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid_input", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_tracker_absence_close", {
    p_attendance_id: parsed.data.attendanceId,
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
    message: "Tracker status closed.",
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
): Extract<
  | ApplyTrackerActionResult
  | ApplyTrackerCorrectionResult
  | ApplyTrackerExpiredAbsenceCloseResult,
  { ok: false }
> {
  return {
    code,
    fieldErrors,
    message: RESULT_MESSAGES[code],
    ok: false,
  };
}
