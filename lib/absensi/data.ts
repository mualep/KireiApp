import "server-only";

import type { StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";
import type { WorkerRole, WorkerShift } from "@/lib/workers";
import { getShiftDefinition, isWorkerRole, isWorkerShift } from "@/lib/workers";
import type { WorkerAttendanceSource } from "@/lib/workers/attendance-records";
import {
  absensiAttendanceLabels,
  getAbsensiMonthRange,
  isAbsensiAttendanceStatus,
  type AbsensiAttendanceStatus,
  type AbsensiMonthRange,
} from "@/lib/absensi/helpers";

export type AbsensiDataIssue = {
  message: string;
};

export type ScheduledCellDTO = {
  id: string;
  notes: string | null;
  scheduledBy: string;
  schedulerName?: string;
  status: AbsensiAttendanceStatus;
  targetDate: string;
};

export type AbsensiCellDTO = {
  attendanceId: string;
  attendanceUpdatedAt: string;
  label: (typeof absensiAttendanceLabels)[AbsensiAttendanceStatus];
  scheduledCell?: ScheduledCellDTO;
  source: WorkerAttendanceSource;
  sourceAction: string;
  status: AbsensiAttendanceStatus;
};

export type AbsensiWorkerRowDTO = {
  activeSpCount: number;
  cellsByDate: Record<string, AbsensiCellDTO>;
  compactRoleShiftLabel: string;
  employeeRole: WorkerRole;
  name: string;
  roleShiftLabel: string;
  shift: WorkerShift;
  shiftTimeLabel: string | null;
  userId: string;
};

export type AbsensiDataResult = {
  issues: AbsensiDataIssue[];
  month: AbsensiMonthRange;
  rows: AbsensiWorkerRowDTO[];
};

type WorkerProfileRow = {
  employee_role: string;
  shift: string;
  user_id: string;
};

type UserRow = {
  email: string;
  id: string;
  is_deleted: boolean;
  name: string;
};

type AttendanceRow = {
  attendance_date: string;
  id: string;
  source: string;
  source_action: string;
  status: string;
  updated_at: string;
  user_id: string;
};

type AbsensiDataRequest = {
  monthParam?: string;
  staff: {
    profile: {
      id: string;
      tier: StaffTier;
    };
  };
};

const compactRoleLabels: Record<WorkerRole, string> = {
  "Cleaning Service": "CL",
  "Customer Service": "CS",
  "Expert Player": "EP",
  Explorer: "EX",
  Internship: "IN",
  "Professional Player": "PP",
  Security: "SC",
};

export async function getAbsensiData({
  monthParam,
  staff,
}: AbsensiDataRequest): Promise<AbsensiDataResult> {
  const month = getAbsensiMonthRange(monthParam);
  const supabase = await createClient();

  let profilesQuery = supabase
    .from("worker_profiles")
    .select("user_id,employee_role,shift")
    .eq("show_card", true);

  if (staff.profile.tier === "member") {
    profilesQuery = profilesQuery.eq("user_id", staff.profile.id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery
    .order("user_id", { ascending: true })
    .returns<WorkerProfileRow[]>();

  if (profilesError) {
    throw new Error("Absensi worker profiles could not load.");
  }

  const profileRows = profiles ?? [];

  if (profileRows.length === 0) {
    return {
      issues: [],
      month,
      rows: [],
    };
  }

  const userIds = profileRows.map((profile) => profile.user_id);
  const [
    { data: users, error: usersError },
    { data: attendanceRows, error: attendanceError },
    { data: sps, error: spsError },
    { data: scheduledRows, error: scheduledError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,email,is_deleted")
      .in("id", userIds)
      .returns<UserRow[]>(),
    supabase
      .from("worker_attendance")
      .select("id,user_id,attendance_date,status,source,source_action,updated_at")
      .in("user_id", userIds)
      .gte("attendance_date", month.monthStart)
      .lt("attendance_date", month.nextMonthStart)
      .eq("is_canceled", false)
      .order("attendance_date", { ascending: true })
      .returns<AttendanceRow[]>(),
    supabase
      .from("worker_sp_logs")
      .select("user_id,sp_level")
      .gt("expires_at", new Date().toISOString())
      .is("revoked_at", null),
    supabase
      .from("scheduled_attendance")
      .select("id, user_id, target_date, status, scheduled_by, notes, scheduler:users!scheduled_attendance_scheduled_by_fkey(name)")
      .in("user_id", userIds)
      .gte("target_date", month.monthStart)
      .lt("target_date", month.nextMonthStart)
      .is("applied_at", null)
      .is("cancelled_at", null),
  ]);

  if (usersError) {
    throw new Error("Absensi users could not load.");
  }

  if (attendanceError) {
    throw new Error("Absensi attendance rows could not load.");
  }

  if (spsError) {
    throw new Error("Absensi SP logs could not load.");
  }

  if (scheduledError) {
    // Non-blocking if scheduled table query fails
    console.warn("Absensi scheduled attendance query error:", scheduledError);
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const cellsByUserId = new Map<string, Record<string, AbsensiCellDTO>>();
  const issues: AbsensiDataIssue[] = [];

  const spsCountMap = new Map<string, number>();
  for (const sp of sps ?? []) {
    spsCountMap.set(sp.user_id, (spsCountMap.get(sp.user_id) ?? 0) + 1);
  }

  for (const attendance of attendanceRows ?? []) {
    if (!isAbsensiAttendanceStatus(attendance.status)) {
      issues.push({
        message: `Attendance row ${attendance.id} has an unsupported status.`,
      });
      continue;
    }

    const source = parseAttendanceSource(attendance.source);

    if (!source) {
      issues.push({
        message: `Attendance row ${attendance.id} has an unsupported source.`,
      });
      continue;
    }

    const cells = cellsByUserId.get(attendance.user_id) ?? {};
    cells[attendance.attendance_date] = {
      attendanceId: attendance.id,
      attendanceUpdatedAt: attendance.updated_at,
      label: absensiAttendanceLabels[attendance.status],
      source,
      sourceAction: attendance.source_action,
      status: attendance.status,
    };
    cellsByUserId.set(attendance.user_id, cells);
  }

  // Process future scheduled_attendance rows
  for (const scheduled of scheduledRows ?? []) {
    if (!isAbsensiAttendanceStatus(scheduled.status)) {
      continue;
    }

    const cells = cellsByUserId.get(scheduled.user_id) ?? {};
    const existingCell = cells[scheduled.target_date];
    const schedulerName = (scheduled.scheduler as any)?.name || "System";
    const scheduledDto: ScheduledCellDTO = {
      id: scheduled.id,
      notes: scheduled.notes,
      scheduledBy: scheduled.scheduled_by,
      schedulerName,
      status: scheduled.status,
      targetDate: scheduled.target_date,
    };

    if (existingCell) {
      existingCell.scheduledCell = scheduledDto;
    } else {
      cells[scheduled.target_date] = {
        attendanceId: "",
        attendanceUpdatedAt: "",
        label: absensiAttendanceLabels[scheduled.status],
        scheduledCell: scheduledDto,
        source: "absensi",
        sourceAction: "scheduled",
        status: scheduled.status,
      };
    }
    cellsByUserId.set(scheduled.user_id, cells);
  }

  const rows = profileRows.flatMap((profile) => {
    const user = usersById.get(profile.user_id);

    if (!user) {
      issues.push({
        message: `Worker ${profile.user_id} is missing a readable staff profile.`,
      });
      return [];
    }

    if (user.is_deleted) {
      return [];
    }

    if (!isWorkerRole(profile.employee_role)) {
      issues.push({
        message: `Worker ${profile.user_id} has an unsupported role.`,
      });
      return [];
    }

    if (!isWorkerShift(profile.shift)) {
      issues.push({
        message: `Worker ${profile.user_id} has an unsupported shift.`,
      });
      return [];
    }

    const roleShiftLabel = getAbsensiRoleShiftLabel(
      profile.employee_role,
      profile.shift,
    );
    const compactRoleShiftLabel = getCompactAbsensiRoleShiftLabel(
      profile.employee_role,
      profile.shift,
    );
    const shiftTimeLabel = getAbsensiShiftTimeLabel(profile.shift);

    return [
      {
        activeSpCount: spsCountMap.get(profile.user_id) ?? 0,
        cellsByDate: cellsByUserId.get(profile.user_id) ?? {},
        compactRoleShiftLabel,
        employeeRole: profile.employee_role,
        name: user.name,
        roleShiftLabel,
        shift: profile.shift,
        shiftTimeLabel,
        userId: profile.user_id,
      } satisfies AbsensiWorkerRowDTO,
    ];
  });

  return {
    issues,
    month,
    rows,
  };
}

function parseAttendanceSource(source: string): WorkerAttendanceSource | null {
  if (source === "manual" || source === "absensi") return "absensi";
  if (source === "auto_tracker" || source === "tracker") return "tracker";
  if (source === "auto_cron" || source === "cron") return "cron";
  if (source === "system") return "system";
  return null;
}

function getAbsensiRoleShiftLabel(role: WorkerRole, shift: WorkerShift): string {
  const shiftDef = getShiftDefinition(shift);
  return `${role} - ${shiftDef.label}`;
}

function getCompactAbsensiRoleShiftLabel(
  role: WorkerRole,
  shift: WorkerShift,
): string {
  const compactRole = compactRoleLabels[role] ?? role;
  const shiftDef = getShiftDefinition(shift);
  return `${compactRole}/${shiftDef.label}`;
}

function getAbsensiShiftTimeLabel(shift: WorkerShift): string | null {
  const shiftDef = getShiftDefinition(shift);

  if (shiftDef.isFlexible) {
    return "Flexible";
  }

  if (
    shiftDef.startHour === null ||
    shiftDef.startMinute === null ||
    shiftDef.endHour === null ||
    shiftDef.endMinute === null
  ) {
    return null;
  }

  const startStr = `${String(shiftDef.startHour).padStart(2, "0")}:${String(shiftDef.startMinute).padStart(2, "0")}`;
  const endStr = `${String(shiftDef.endHour).padStart(2, "0")}:${String(shiftDef.endMinute).padStart(2, "0")}`;

  return `${startStr}-${endStr}`;
}
