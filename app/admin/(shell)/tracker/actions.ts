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
  canStaffTierMaterializeTrackerAbsence,
  trackerAbsenceMaterializationActions,
  type TrackerAbsenceMaterializationAction,
} from "@/lib/workers/tracker-absence-materialization";
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

const materializeTrackerAbsenceDaysSchema = z.object({
  action: z.enum(trackerAbsenceMaterializationActions),
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
  | "cuti_stock_insufficient_for_range"
  | "generic_error"
  | "materialization_conflict"
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

export type ApplyTrackerAbsenceMaterializationResult =
  | {
      action: TrackerAbsenceMaterializationAction;
      code: "success";
      insertedCount: number;
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
  cuti_stock_insufficient_for_range: "CUTI stock is insufficient to cover all missing absence days.",
  generic_error: "We could not apply that tracker action. Please try again.",
  invalid_action: "Choose a valid tracker action.",
  invalid_correction_action: "Choose a valid tracker correction.",
  invalid_correction_input: "Add a reason and choose a valid attendance entry.",
  invalid_input: "Check the tracker action details and try again.",
  invalid_target: "Choose a valid worker target.",
  invalid_transition: "That tracker action is not allowed from the current status.",
  materialization_conflict: "Absensi sync found an unsafe attendance conflict.",
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
  "tracker.cuti_stock_insufficient_for_range": "cuti_stock_insufficient_for_range",
  "tracker.invalid_action": "invalid_action",
  "tracker.invalid_correction_action": "invalid_correction_action",
  "tracker.invalid_correction_input": "invalid_correction_input",
  "tracker.invalid_target": "invalid_target",
  "tracker.invalid_transition": "invalid_transition",
  "tracker.materialization_conflict": "materialization_conflict",
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

  if (parsed.data.action === "CANCEL_START") {
    // 1. Fetch current worker status
    const { data: workerStatus, error: fetchError } = await supabase
      .from("worker_status")
      .select("*")
      .eq("user_id", parsed.data.targetUserId)
      .single();

    if (fetchError || !workerStatus) {
      return actionError("invalid_target");
    }

    if (workerStatus.version !== parsed.data.expectedVersion) {
      return actionError("version_conflict");
    }

    if (workerStatus.current_status !== "on") {
      return actionError("invalid_transition");
    }

    const shiftStartedAt = workerStatus.shift_active_started_at || workerStatus.shift_started_at;

    if (!shiftStartedAt) {
      return {
        code: "generic_error",
        message: "Batas waktu pembatalan (15 menit) telah habis.",
        ok: false,
      };
    }

    const startTime = new Date(shiftStartedAt).getTime();
    const nowTime = new Date().getTime();
    if (nowTime - startTime > 15 * 60 * 1000) {
      return {
        code: "generic_error",
        message: "Batas waktu pembatalan (15 menit) telah habis.",
        ok: false,
      };
    }

    const { getOperationalDate } = await import("@/lib/utils");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    // 2. Delete worker_attendance for the target date
    const targetDate = getOperationalDate(new Date(shiftStartedAt));
    const { error: deleteError } = await adminClient
      .from("worker_attendance")
      .delete()
      .eq("user_id", parsed.data.targetUserId)
      .eq("attendance_date", targetDate);

    if (deleteError) {
      console.error("[CANCEL_START] Delete Error:", deleteError);
      return actionError("generic_error");
    }

    // 3. Revert worker_status (derived off revert)
    const { error: updateError } = await adminClient
      .from("worker_status")
      .update({
        current_status: "off",
        shift_active_date: null,
        shift_active_started_at: null,
        shift_active_label: null,
        shift_active_start_hour: null,
        shift_active_start_min: null,
        shift_active_end_hour: null,
        shift_active_end_min: null,
        version: Number(workerStatus.version) + 1,
      })
      .eq("user_id", parsed.data.targetUserId);

    if (updateError) {
      console.error("[CANCEL_START] Update Error:", updateError);
      return actionError("generic_error");
    }

    // 4. Log audit activity
    const { logAudit } = await import("@/lib/audit-logger");
    await logAudit(
      staff.profile.id,
      "tracker",
      "tracker.cancel_start",
      parsed.data.targetUserId,
      { action: "CANCEL_START", date: targetDate }
    );

    revalidatePath("/admin/tracker");

    return {
      action: parsed.data.action,
      code: "success",
      message: RESULT_MESSAGES.success,
      ok: true,
      targetUserId: parsed.data.targetUserId,
    };
  }

  try {
    const { error } = await supabase.rpc("apply_tracker_action", {
      p_action: parsed.data.action,
      p_expected_version: parsed.data.expectedVersion,
      p_target_user_id: parsed.data.targetUserId,
    });

    if (error) {
      return actionError(mapTrackerRpcError(error.message));
    }
  } catch (err) {
    console.error("[applyTrackerAction] RPC Error:", err);
    return actionError("generic_error");
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

export async function materializeTrackerAbsenceDays(
  input: unknown,
): Promise<ApplyTrackerAbsenceMaterializationResult> {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    return actionError("unauthenticated");
  }

  if (!canStaffTierMaterializeTrackerAbsence(staff.profile.tier)) {
    return actionError("unauthorized");
  }

  const parsed = materializeTrackerAbsenceDaysSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid_input", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("materialize_tracker_absence_days", {
    p_expected_version: parsed.data.expectedVersion,
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return actionError(mapTrackerRpcError(error.message));
  }

  revalidatePath("/admin/tracker");
  revalidatePath("/admin/absensi");
  revalidatePath("/admin/records");

  const insertedCount = getInsertedCount(data);

  return {
    action: parsed.data.action,
    code: "success",
    insertedCount,
    message:
      insertedCount === 0
        ? "Absensi already synchronized."
        : `Absensi synchronized for ${insertedCount} day${insertedCount === 1 ? "" : "s"}.`,
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
  | ApplyTrackerExpiredAbsenceCloseResult
  | ApplyTrackerAbsenceMaterializationResult,
  { ok: false }
> {
  return {
    code,
    fieldErrors,
    message: RESULT_MESSAGES[code],
    ok: false,
  };
}

function getInsertedCount(data: unknown): number {
  if (
    data &&
    typeof data === "object" &&
    "inserted_count" in data &&
    typeof data.inserted_count === "number"
  ) {
    return data.inserted_count;
  }

  return 0;
}
