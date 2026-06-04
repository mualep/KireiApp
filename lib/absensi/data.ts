import "server-only";

import type { StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";
import type { WorkerRole, WorkerShift } from "@/lib/workers";
import { isWorkerRole, isWorkerShift } from "@/lib/workers";
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

export type AbsensiCellDTO = {
  attendanceId: string;
  label: (typeof absensiAttendanceLabels)[AbsensiAttendanceStatus];
  source: WorkerAttendanceSource;
  sourceAction: string;
  status: AbsensiAttendanceStatus;
};

export type AbsensiWorkerRowDTO = {
  cellsByDate: Record<string, AbsensiCellDTO>;
  employeeRole: WorkerRole;
  gid: string;
  name: string;
  shift: WorkerShift;
  userId: string;
};

export type AbsensiDataResult = {
  issues: AbsensiDataIssue[];
  month: AbsensiMonthRange;
  rows: AbsensiWorkerRowDTO[];
};

type WorkerProfileRow = {
  employee_role: string;
  gid: string;
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

export async function getAbsensiData({
  monthParam,
  staff,
}: AbsensiDataRequest): Promise<AbsensiDataResult> {
  const month = getAbsensiMonthRange(monthParam);
  const supabase = await createClient();

  let profilesQuery = supabase
    .from("worker_profiles")
    .select("user_id,gid,employee_role,shift")
    .eq("show_card", true);

  if (staff.profile.tier === "member") {
    profilesQuery = profilesQuery.eq("user_id", staff.profile.id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery
    .order("gid", { ascending: true })
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
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,email,is_deleted")
      .in("id", userIds)
      .returns<UserRow[]>(),
    supabase
      .from("worker_attendance")
      .select("id,user_id,attendance_date,status,source,source_action")
      .in("user_id", userIds)
      .gte("attendance_date", month.monthStart)
      .lt("attendance_date", month.nextMonthStart)
      .eq("is_canceled", false)
      .order("attendance_date", { ascending: true })
      .returns<AttendanceRow[]>(),
  ]);

  if (usersError) {
    throw new Error("Absensi users could not load.");
  }

  if (attendanceError) {
    throw new Error("Absensi attendance rows could not load.");
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const cellsByUserId = new Map<string, Record<string, AbsensiCellDTO>>();
  const issues: AbsensiDataIssue[] = [];

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
      label: absensiAttendanceLabels[attendance.status],
      source,
      sourceAction: attendance.source_action,
      status: attendance.status,
    };
    cellsByUserId.set(attendance.user_id, cells);
  }

  const rows = profileRows.flatMap((profile) => {
    const user = usersById.get(profile.user_id);

    if (!user) {
      issues.push({
        message: `Worker ${profile.gid} is missing a readable staff profile.`,
      });
      return [];
    }

    if (user.is_deleted) {
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

    return [
      {
        cellsByDate: cellsByUserId.get(profile.user_id) ?? {},
        employeeRole: profile.employee_role,
        gid: profile.gid,
        name: user.name,
        shift: profile.shift,
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

function parseAttendanceSource(value: string): WorkerAttendanceSource | null {
  if (
    value === "tracker" ||
    value === "absensi" ||
    value === "cron" ||
    value === "system"
  ) {
    return value;
  }

  return null;
}
