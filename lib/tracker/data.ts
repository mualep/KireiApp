import "server-only";

import type { StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";
import {
  computeWorkerDisplayStatus,
  getTrackerCorrectionWindowState,
  getShiftDefinition,
  isWorkerRole,
  isWorkerShift,
  isWorkerStoredStatus,
  type TrackerCardDTO,
} from "@/lib/workers";
import { scopeTrackerCards } from "@/lib/tracker/helpers";
import { getRecordsMonthRange } from "@/lib/records/helpers";

export type TrackerDataIssue = {
  message: string;
};

export type TrackerDataResult = {
  cards: TrackerCardDTO[];
  issues: TrackerDataIssue[];
};

export type TrackerDataStaff = {
  profile: {
    id: string;
    tier: StaffTier;
  };
};

type WorkerProfileRow = {
  cuti_stock: number;
  employee_role: string;
  gid: string;
  is_flexible: boolean;
  shift: string;
  shift_end_hour: number | null;
  shift_end_min: number | null;
  shift_start_hour: number | null;
  shift_start_min: number | null;
  show_card: boolean;
  user_id: string;
};

type WorkerStatusRow = {
  alpha_done: boolean;
  break_accumulated_secs: number;
  break_started_at: string | null;
  break_timer_running: boolean;
  current_status: string;
  cuti_set_date: string | null;
  pending_started_at: string | null;
  sakit_started_at: string | null;
  updated_at: string;
  user_id: string;
  version: number | string;
};

type UserRow = {
  email: string;
  id: string;
  is_deleted: boolean;
  name: string;
};

type ActiveTrackerAttendanceRow = {
  attendance_date: string;
  id: string;
  source_action: string;
  status: string;
  user_id: string;
};

type WorkerRecordRow = {
  alpha_count: number | null;
  break_late_seconds: number | null;
  lembur_units: number | null;
  pending_days: number | null;
  period_month: string;
  sakit_days: number | null;
  user_id: string;
  work_late_seconds: number | null;
};

export async function getTrackerData(staff: TrackerDataStaff): Promise<TrackerDataResult> {
  const supabase = await createClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("worker_profiles")
    .select(
      "user_id,gid,employee_role,shift,is_flexible,shift_start_hour,shift_start_min,shift_end_hour,shift_end_min,show_card,cuti_stock",
    )
    .eq("show_card", true)
    .returns<WorkerProfileRow[]>();

  if (profilesError) {
    throw new Error("Tracker worker profiles could not load.");
  }

  const profileRows = profiles ?? [];

  if (profileRows.length === 0) {
    return {
      cards: [],
      issues: [],
    };
  }

  const userIds = profileRows.map((profile) => profile.user_id);
  const recordsMonth = getRecordsMonthRange();
  const [
    { data: users, error: usersError },
    { data: statuses, error: statusesError },
    { data: activeTrackerAttendances, error: attendancesError },
    { data: records, error: recordsError },
  ] =
    await Promise.all([
      supabase
        .from("users")
        .select("id,name,email,is_deleted")
        .in("id", userIds)
        .returns<UserRow[]>(),
      supabase
        .from("worker_status")
        .select(
          "user_id,version,current_status,alpha_done,updated_at,break_started_at,break_timer_running,break_accumulated_secs,cuti_set_date,sakit_started_at,pending_started_at",
        )
        .in("user_id", userIds)
        .returns<WorkerStatusRow[]>(),
      supabase
        .from("worker_attendance")
        .select("id,user_id,attendance_date,status,source_action")
        .in("user_id", userIds)
        .eq("source", "tracker")
        .eq("is_canceled", false)
        .order("attendance_date", { ascending: false })
        .returns<ActiveTrackerAttendanceRow[]>(),
      supabase
        .from("worker_records")
        .select(
          "user_id,period_month,work_late_seconds,break_late_seconds,alpha_count,sakit_days,pending_days,lembur_units",
        )
        .in("user_id", userIds)
        .eq("period_month", recordsMonth.monthStart)
        .returns<WorkerRecordRow[]>(),
    ]);

  if (usersError) {
    throw new Error("Tracker users could not load.");
  }

  if (statusesError) {
    throw new Error("Tracker worker statuses could not load.");
  }

  if (attendancesError) {
    throw new Error("Tracker attendance rows could not load.");
  }

  if (recordsError) {
    throw new Error("Tracker worker record badges could not load.");
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const statusesByUserId = new Map(
    (statuses ?? []).map((status) => [status.user_id, status]),
  );
  const activeTrackerAttendancesByUserId = new Map<string, ActiveTrackerAttendanceRow>();
  const recordsByUserId = new Map((records ?? []).map((record) => [record.user_id, record]));

  for (const attendance of activeTrackerAttendances ?? []) {
    if (!activeTrackerAttendancesByUserId.has(attendance.user_id)) {
      activeTrackerAttendancesByUserId.set(attendance.user_id, attendance);
    }
  }
  const issues: TrackerDataIssue[] = [];
  const now = new Date();
  const cards = profileRows.flatMap((profile) => {
    const user = usersById.get(profile.user_id);
    const status = statusesByUserId.get(profile.user_id);
    const record = recordsByUserId.get(profile.user_id);

    if (!user) {
      issues.push({
        message: `Worker ${profile.gid} is missing a readable staff profile.`,
      });
      return [];
    }

    if (user.is_deleted) {
      return [];
    }

    if (!status) {
      issues.push({
        message: `Worker ${profile.gid} is missing a readable status row.`,
      });
      return [];
    }

    if (!isWorkerRole(profile.employee_role)) {
      issues.push({
        message: `Worker ${profile.gid} has an unsupported role.`,
      });
      return [];
    }

    if (!isWorkerShift(profile.shift)) {
      issues.push({
        message: `Worker ${profile.gid} has an unsupported shift.`,
      });
      return [];
    }

    if (!isWorkerStoredStatus(status.current_status)) {
      issues.push({
        message: `Worker ${profile.gid} has an unsupported stored status.`,
      });
      return [];
    }

    const shift = getShiftDefinition(profile.shift);
    const activeTrackerAttendance = getMatchingTrackerAttendance(
      activeTrackerAttendancesByUserId.get(profile.user_id),
      status.current_status,
    );
    const trackerAbsenceMarkerDate = getTrackerAbsenceMarkerDate(status);
    const correctionWindowState = getTrackerCorrectionWindowState({
      attendanceDate: activeTrackerAttendance?.attendance_date ?? trackerAbsenceMarkerDate,
      isFlexible: profile.is_flexible,
      now,
      shiftEndHour: profile.shift_end_hour,
      shiftEndMinute: profile.shift_end_min,
      shiftStartHour: profile.shift_start_hour,
      shiftStartMinute: profile.shift_start_min,
    });
    const isTrackerAbsenceCloseIdentified =
      activeTrackerAttendance !== null || trackerAbsenceMarkerDate !== null;

    return [
      {
        activeTrackerAttendanceId: activeTrackerAttendance?.id ?? null,
        breakAccumulatedSecs: status.break_accumulated_secs,
        breakLateSeconds: record?.break_late_seconds ?? 0,
        breakStartedAt: status.break_started_at,
        breakTimerRunning: status.break_timer_running,
        cutiStock: profile.cuti_stock,
        displayStatus: computeWorkerDisplayStatus({
          alphaDone: status.alpha_done,
          currentStatus: status.current_status,
          isFlexible: profile.is_flexible,
          now,
          shift,
        }),
        employeeRole: profile.employee_role,
        gid: profile.gid,
        alphaCount: record?.alpha_count ?? 0,
        isFlexible: profile.is_flexible,
        isExpiredAbsenceCloseAvailable:
          isTrackerAbsenceCloseIdentified && correctionWindowState === "expired",
        isTrackerCorrectionAvailable:
          activeTrackerAttendance !== null && correctionWindowState === "open",
        lemburUnits: record?.lembur_units ?? 0,
        name: user.name,
        pendingDays: record?.pending_days ?? 0,
        sakitDays: record?.sakit_days ?? 0,
        shift: profile.shift,
        showCard: profile.show_card,
        statusUpdatedAt: status.updated_at,
        storedStatus: status.current_status,
        userId: profile.user_id,
        version: Number(status.version),
        workLateSeconds: record?.work_late_seconds ?? 0,
      } satisfies TrackerCardDTO,
    ];
  });

  return {
    cards: scopeTrackerCards(cards, {
      tier: staff.profile.tier,
      userId: staff.profile.id,
    }),
    issues,
  };
}

function getTrackerAbsenceMarkerDate(status: WorkerStatusRow): string | null {
  if (status.current_status === "cuti") {
    return isIsoDate(status.cuti_set_date) ? status.cuti_set_date : null;
  }

  if (status.current_status === "sakit") {
    return getWibDateFromTimestamp(status.sakit_started_at);
  }

  if (status.current_status === "pending") {
    return getWibDateFromTimestamp(status.pending_started_at);
  }

  return null;
}

function getWibDateFromTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const wibDate = new Date(timestamp + 7 * 60 * 60 * 1000);

  return [
    wibDate.getUTCFullYear(),
    String(wibDate.getUTCMonth() + 1).padStart(2, "0"),
    String(wibDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isIsoDate(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getMatchingTrackerAttendance(
  attendance: ActiveTrackerAttendanceRow | undefined,
  storedStatus: string,
): ActiveTrackerAttendanceRow | null {
  if (!attendance) {
    return null;
  }

  const expectedSourceAction = {
    cuti: "tracker.cuti",
    pending: "tracker.izin",
    sakit: "tracker.sakit",
  }[storedStatus];

  return attendance.status === storedStatus && attendance.source_action === expectedSourceAction
    ? attendance
    : null;
}
