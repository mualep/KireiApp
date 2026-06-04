import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const absensiCorrectionBeforeStatuses = [
  "none",
  "hadir",
  "cuti",
  "sakit",
  "pending",
  "alpha",
] as const;

export const absensiCorrectionAfterStatuses = [
  "hadir",
  "cuti",
  "sakit",
  "pending",
  "alpha",
] as const;

const dateParamPattern = /^\d{4}-\d{2}-\d{2}$/;

export const applyAbsensiCorrectionSchema = z.object({
  afterStatus: z.enum(absensiCorrectionAfterStatuses),
  attendanceDate: z.string().regex(dateParamPattern),
  beforeStatus: z.enum(absensiCorrectionBeforeStatuses),
  expectedAttendanceId: z.string().uuid().nullable(),
  expectedAttendanceUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  reason: z.string().trim().min(1).max(500),
  targetUserId: z.string().uuid(),
});

const absensiCorrectionRpcResultSchema = z.object({
  after_status: z.string(),
  attendance_id: z.string().uuid(),
  audit_id: z.string().uuid().nullable(),
  before_status: z.string(),
  correction_id: z.string().uuid(),
});

export type ApplyAbsensiCorrectionInput = z.infer<
  typeof applyAbsensiCorrectionSchema
>;

export type ApplyAbsensiCorrectionResult =
  | {
      afterStatus: string;
      attendanceId: string;
      auditId: string | null;
      beforeStatus: string;
      correctionId: string;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

const RPC_ERROR_CODES: Partial<Record<string, string>> = {
  "absensi.attendance_conflict": "attendance_conflict",
  "absensi.cuti_stock_exhausted": "cuti_stock_exhausted",
  "absensi.invalid_date": "invalid_date",
  "absensi.invalid_input": "invalid_input",
  "absensi.invalid_target": "invalid_target",
  "absensi.invalid_transition": "invalid_transition",
  "absensi.records_missing": "records_missing",
  "absensi.unauthenticated": "unauthenticated",
  "absensi.unauthorized": "unauthorized",
};

export async function applyAbsensiCorrectionMutation(
  input: unknown,
): Promise<ApplyAbsensiCorrectionResult> {
  const parsed = applyAbsensiCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid_input");
  }

  if (parsed.data.beforeStatus === parsed.data.afterStatus) {
    return actionError("invalid_transition");
  }

  if (parsed.data.beforeStatus === "hadir") {
    return actionError("invalid_transition");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_absensi_correction", {
    p_after_status: parsed.data.afterStatus,
    p_attendance_date: parsed.data.attendanceDate,
    p_before_status: parsed.data.beforeStatus,
    p_expected_attendance_id: parsed.data.expectedAttendanceId,
    p_expected_attendance_updated_at: parsed.data.expectedAttendanceUpdatedAt,
    p_reason: parsed.data.reason,
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return actionError(mapAbsensiRpcError(error.message));
  }

  const rpcResult = absensiCorrectionRpcResultSchema.safeParse(data);

  if (!rpcResult.success) {
    return actionError("generic_error");
  }

  return {
    afterStatus: rpcResult.data.after_status,
    attendanceId: rpcResult.data.attendance_id,
    auditId: rpcResult.data.audit_id,
    beforeStatus: rpcResult.data.before_status,
    correctionId: rpcResult.data.correction_id,
    ok: true,
  };
}

function mapAbsensiRpcError(message: string): string {
  return RPC_ERROR_CODES[message] ?? "generic_error";
}

function actionError(error: string): Extract<ApplyAbsensiCorrectionResult, { ok: false }> {
  return {
    error,
    ok: false,
  };
}
