import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  computeWorkerDisplayStatus,
  getShiftDefinition,
  isWorkerShift,
  type WorkerDisplayStatus,
  type WorkerRole,
  type WorkerShift,
  type WorkerStoredStatus,
} from "@/lib/workers";

export type MemberMonthlyRecords = {
  alphaCount: number;
  breakLateSeconds: number;
  cutiStock: number;
  lemburUnits: number;
  pendingDays: number;
  sakitDays: number;
  workLateSeconds: number;
};

export type MemberAttendanceMap = Record<string, "hadir" | "cuti" | "sakit" | "pending" | "alpha">;

export type MemberDailyTaskProgress = {
  completedCount: number;
  hasTaskToday: boolean;
  percentage: number;
  status: string | null;
  taskId: string | null;
  totalCount: number;
};

export type MemberActiveSp = {
  createdAt: string;
  expiresAt: string;
  id: string;
  reason: string;
  spLevel: number;
};

export type MemberPerformanceData = {
  activeSp: MemberActiveSp | null;
  dailyTask: MemberDailyTaskProgress;
  monthlyAttendance: MemberAttendanceMap;
  monthlyRecords: MemberMonthlyRecords;
  periodMonthStr: string;
  profile: {
    cutiStock: number;
    employeeRole: WorkerRole | "Staff";
    gid: string | null;
    shift: WorkerShift | "A";
  };
  status: {
    currentStatus: WorkerStoredStatus;
    displayStatus: WorkerDisplayStatus;
    shiftActiveLabel: string | null;
    shiftStartedAt: string | null;
  };
  todayWIB: string;
  user: {
    email: string;
    id: string;
    name: string;
    tier: string;
  };
};

export async function getMemberPerformanceData(
  userId: string,
): Promise<MemberPerformanceData> {
  const supabase = await createClient();

  // 1. Calculate WIB time strings
  const now = new Date();
  const todayWIB = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(now); // "YYYY-MM-DD"

  const currentMonthStr = todayWIB.slice(0, 7); // "YYYY-MM"
  const periodMonthStr = `${currentMonthStr}-01`; // "YYYY-MM-01"

  const [yearNum, monthNum] = currentMonthStr.split("-").map(Number);
  const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthStartStr = `${currentMonthStr}-01`;
  const monthEndStr = `${currentMonthStr}-${String(lastDayOfMonth).padStart(2, "0")}`;

  // 2. Execute parallel queries filtered STRICTLY by userId
  const [
    { data: userRow },
    { data: profileRow },
    { data: statusRow },
    { data: recordRow },
    { data: attendanceRows },
    { data: taskRow },
    { data: spRow },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, tier")
      .eq("id", userId)
      .single(),
    supabase
      .from("worker_profiles")
      .select(
        "gid, employee_role, shift, cuti_stock, is_flexible, shift_start_hour, shift_start_min, shift_end_hour, shift_end_min",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("worker_status")
      .select(
        "current_status, alpha_done, shift_active_label, shift_active_started_at, shift_active_date",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("worker_records")
      .select("*")
      .eq("user_id", userId)
      .eq("period_month", periodMonthStr)
      .maybeSingle(),
    supabase
      .from("worker_attendance")
      .select("attendance_date, status, is_canceled")
      .eq("user_id", userId)
      .gte("attendance_date", monthStartStr)
      .lte("attendance_date", monthEndStr)
      .eq("is_canceled", false),
    supabase
      .from("daily_tasks")
      .select("id, status, selected_games, checklist_snapshot, checklist_answers")
      .eq("user_id", userId)
      .eq("task_date", todayWIB)
      .maybeSingle(),
    supabase
      .from("worker_sp_logs")
      .select("id, sp_level, reason, expires_at, created_at, revoked_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // 3. Process User & Profile Data
  const shiftKey: WorkerShift = isWorkerShift(profileRow?.shift)
    ? profileRow.shift
    : "A";
  const shiftDef = getShiftDefinition(shiftKey);

  const rawStoredStatus: WorkerStoredStatus =
    (statusRow?.current_status as WorkerStoredStatus) || "off";

  const displayStatus = computeWorkerDisplayStatus({
    alphaDone: statusRow?.alpha_done ?? false,
    currentStatus: rawStoredStatus,
    isFlexible: profileRow?.is_flexible ?? shiftDef.isFlexible,
    now,
    shift: shiftDef,
    shiftActiveDate: statusRow?.shift_active_date,
  });

  // 4. Process Monthly Records (using recordRow.cuti_stock_snapshot with delta overrides)
  const monthlyRecords: MemberMonthlyRecords = {
    alphaCount: Math.max(
      0,
      (recordRow?.alpha_count || 0) + (recordRow?.alpha_delta || 0),
    ),
    breakLateSeconds: Math.max(
      0,
      (recordRow?.break_late_seconds || 0) + (recordRow?.break_late_delta || 0),
    ),
    cutiStock: Math.max(
      0,
      (recordRow?.cuti_stock_snapshot ?? profileRow?.cuti_stock ?? 0) +
        (recordRow?.cuti_stock_delta || 0),
    ),
    lemburUnits: Math.max(
      0,
      (recordRow?.lembur_units || 0) + (recordRow?.lembur_delta || 0),
    ),
    pendingDays: Math.max(
      0,
      (recordRow?.pending_days || 0) + (recordRow?.pending_delta || 0),
    ),
    sakitDays: Math.max(
      0,
      (recordRow?.sakit_days || 0) + (recordRow?.sakit_delta || 0),
    ),
    workLateSeconds: Math.max(
      0,
      (recordRow?.work_late_seconds || 0) + (recordRow?.work_late_delta || 0),
    ),
  };

  // 5. Process Attendance Map for Calendar Grid
  const monthlyAttendance: MemberAttendanceMap = {};
  if (attendanceRows && attendanceRows.length > 0) {
    for (const row of attendanceRows) {
      if (
        row.attendance_date &&
        ["hadir", "cuti", "sakit", "pending", "alpha"].includes(row.status)
      ) {
        monthlyAttendance[row.attendance_date] = row.status as
          | "hadir"
          | "cuti"
          | "sakit"
          | "pending"
          | "alpha";
      }
    }
  }

  // 6. Process Daily Task Progress (Filter snapshot by selected_games + before/after work)
  let dailyTask: MemberDailyTaskProgress = {
    completedCount: 0,
    hasTaskToday: false,
    percentage: 0,
    status: null,
    taskId: null,
    totalCount: 0,
  };

  if (taskRow) {
    const selectedGames = Array.isArray(taskRow.selected_games)
      ? taskRow.selected_games
      : [];
    const snapshot = (taskRow.checklist_snapshot || []) as Array<{
      game?: string;
      id: string;
      phase?: string;
    }>;
    const answers = (taskRow.checklist_answers || {}) as Record<
      string,
      { checked?: boolean }
    >;

    let applicableItems = snapshot;
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      applicableItems = snapshot.filter((item) => {
        if (!item) return false;
        if (item.phase === "before_work" || item.game === "_before_work") return true;
        if (item.phase === "after_work" || item.game === "_after_work") return true;
        if (item.game && selectedGames.includes(item.game)) return true;
        return false;
      });
    }

    let completedCount = 0;
    if (applicableItems.length > 0) {
      applicableItems.forEach((item) => {
        if (answers[item.id]?.checked === true) {
          completedCount += 1;
        }
      });
    } else {
      Object.values(answers).forEach((val) => {
        if (val && val.checked === true) {
          completedCount += 1;
        }
      });
    }

    const totalCount =
      applicableItems.length > 0
        ? applicableItems.length
        : Object.keys(answers).length;

    const percentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    dailyTask = {
      completedCount,
      hasTaskToday: true,
      percentage,
      status: taskRow.status,
      taskId: taskRow.id,
      totalCount,
    };
  }

  const activeSp: MemberActiveSp | null = spRow
    ? {
        createdAt: spRow.created_at,
        expiresAt: spRow.expires_at,
        id: spRow.id,
        reason: spRow.reason,
        spLevel: spRow.sp_level,
      }
    : null;

  return {
    activeSp,
    dailyTask,
    monthlyAttendance,
    monthlyRecords,
    periodMonthStr,
    profile: {
      cutiStock: profileRow?.cuti_stock ?? 0,
      employeeRole: (profileRow?.employee_role as WorkerRole) || "Player",
      gid: profileRow?.gid || null,
      shift: shiftKey,
    },
    status: {
      currentStatus: rawStoredStatus,
      displayStatus,
      shiftActiveLabel: statusRow?.shift_active_label || null,
      shiftStartedAt: statusRow?.shift_active_started_at || null,
    },
    todayWIB,
    user: {
      email: userRow?.email || "",
      id: userRow?.id || userId,
      name: userRow?.name || "Member",
      tier: userRow?.tier || "member",
    },
  };
}
