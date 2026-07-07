import "server-only";

import type { StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";
import {
  getShiftDefinition,
  isWorkerRole,
  isWorkerShift,
  type WorkerRole,
  type WorkerShift,
} from "@/lib/workers";
import type { WorkerAttendanceSource } from "@/lib/workers/attendance-records";
import {
  getEffectiveRecordMetric,
  getRecordsMonthRange,
  type EffectiveRecordMetric,
  type RecordsMonthRange,
} from "@/lib/records/helpers";

export type RecordsDataIssue = {
  message: string;
};

export type RecordsRowDTO = {
  activeSpCount: number;
  alphaCount: EffectiveRecordMetric;
  breakLateSeconds: EffectiveRecordMetric;
  compactRoleShiftLabel: string;
  cutiStockSnapshot: EffectiveRecordMetric<number | null>;
  employeeRole: WorkerRole;
  lastSource: WorkerAttendanceSource | null;
  lastSourceAction: string | null;
  lemburUnits: EffectiveRecordMetric;
  name: string;
  pendingDays: EffectiveRecordMetric;
  periodMonth: string;
  roleShiftLabel: string;
  sakitDays: EffectiveRecordMetric;
  shift: WorkerShift;
  shiftTimeLabel: string | null;
  updatedAt: string | null;
  userId: string;
  workLateSeconds: EffectiveRecordMetric;
};

export type RecordsDataResult = {
  issues: RecordsDataIssue[];
  month: RecordsMonthRange;
  rows: RecordsRowDTO[];
};

type WorkerProfileRow = {
  cuti_stock: number;
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

type WorkerRecordRow = {
  alpha_count: number;
  alpha_delta: number;
  break_late_delta: number;
  break_late_seconds: number;
  cuti_stock_delta: number;
  cuti_stock_snapshot: number | null;
  last_source: string | null;
  last_source_action: string | null;
  lembur_delta: number;
  lembur_units: number;
  pending_days: number;
  pending_delta: number;
  period_month: string;
  sakit_days: number;
  sakit_delta: number;
  updated_at: string | null;
  user_id: string;
  work_late_delta: number;
  work_late_seconds: number;
};

type RecordsDataRequest = {
  monthParam?: string;
  staff: {
    profile: {
      id: string;
      tier: StaffTier;
    };
  };
};

const compactRoleLabels: Record<WorkerRole, string> = {
  "Cleaning Service": "Cleaning",
  "Customer Service": "CS",
  "Expert Player": "EP",
  Explorer: "Explorer",
  Internship: "Internship",
  "Professional Player": "PP",
  Security: "Security",
};

export async function getRecordsData({
  monthParam,
  staff,
}: RecordsDataRequest): Promise<RecordsDataResult> {
  const month = getRecordsMonthRange(monthParam);
  const supabase = await createClient();

  let profilesQuery = supabase
    .from("worker_profiles")
    .select("user_id,employee_role,shift,cuti_stock")
    .eq("show_card", true);

  if (staff.profile.tier === "member") {
    profilesQuery = profilesQuery.eq("user_id", staff.profile.id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery
    .order("user_id", { ascending: true })
    .returns<WorkerProfileRow[]>();

  if (profilesError) {
    throw new Error("Records worker profiles could not load.");
  }

  const profileRows = profiles ?? [];

  if (profileRows.length === 0) {
    return { issues: [], month, rows: [] };
  }

  const userIds = profileRows.map((profile) => profile.user_id);
  const [
    { data: users, error: usersError },
    { data: records, error: recordsError },
    { data: sps, error: spsError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,email,is_deleted")
      .in("id", userIds)
      .returns<UserRow[]>(),
    supabase
      .from("worker_records")
      .select(
        [
          "user_id",
          "period_month",
          "work_late_seconds",
          "break_late_seconds",
          "alpha_count",
          "sakit_days",
          "pending_days",
          "lembur_units",
          "cuti_stock_snapshot",
          "work_late_delta",
          "break_late_delta",
          "alpha_delta",
          "sakit_delta",
          "pending_delta",
          "lembur_delta",
          "cuti_stock_delta",
          "last_source",
          "last_source_action",
          "updated_at",
        ].join(","),
      )
      .in("user_id", userIds)
      .eq("period_month", month.monthStart)
      .order("user_id", { ascending: true })
      .returns<WorkerRecordRow[]>(),
    supabase
      .from("worker_sp_logs")
      .select("user_id,sp_level")
      .gt("expires_at", new Date().toISOString())
      .is("revoked_at", null),
  ]);

  if (usersError) {
    throw new Error("Records users could not load.");
  }

  if (recordsError) {
    throw new Error("Records worker record badges could not load.");
  }

  if (spsError) {
    throw new Error("Records SP logs could not load.");
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const recordsByUserId = new Map(
    (records ?? []).map((record) => [record.user_id, record]),
  );

  const spsCountMap = new Map<string, number>();
  for (const sp of sps ?? []) {
    spsCountMap.set(sp.user_id, (spsCountMap.get(sp.user_id) ?? 0) + 1);
  }

  const issues: RecordsDataIssue[] = [];

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

    const record = recordsByUserId.get(profile.user_id);
    const workerRecord =
      record ?? createEmptyRecordRow(month.monthStart, profile.user_id, profile.cuti_stock);
    const shiftTimeLabel = getRecordsShiftTimeLabel(profile.shift);
    const roleShiftLabel = getRecordsRoleShiftLabel(
      profile.employee_role,
      profile.shift,
    );
    const compactRoleShiftLabel = getCompactRecordsRoleShiftLabel(
      profile.employee_role,
      profile.shift,
    );

    return [
      {
        activeSpCount: spsCountMap.get(profile.user_id) ?? 0,
        alphaCount: getEffectiveRecordMetric(
          workerRecord.alpha_count,
          workerRecord.alpha_delta,
        ),
        breakLateSeconds: getEffectiveRecordMetric(
          workerRecord.break_late_seconds,
          workerRecord.break_late_delta,
        ),
        compactRoleShiftLabel,
        cutiStockSnapshot: getEffectiveRecordMetric(
          workerRecord.cuti_stock_snapshot ?? profile.cuti_stock,
          workerRecord.cuti_stock_delta,
        ),
        employeeRole: profile.employee_role,
        lastSource: parseRecordSource(workerRecord.last_source),
        lastSourceAction: workerRecord.last_source_action,
        lemburUnits: getEffectiveRecordMetric(
          workerRecord.lembur_units,
          workerRecord.lembur_delta,
        ),
        name: user.name,
        pendingDays: getEffectiveRecordMetric(
          workerRecord.pending_days,
          workerRecord.pending_delta,
        ),
        periodMonth: workerRecord.period_month,
        roleShiftLabel,
        sakitDays: getEffectiveRecordMetric(
          workerRecord.sakit_days,
          workerRecord.sakit_delta,
        ),
        shift: profile.shift,
        shiftTimeLabel,
        updatedAt: workerRecord.updated_at,
        userId: profile.user_id,
        workLateSeconds: getEffectiveRecordMetric(
          workerRecord.work_late_seconds,
          workerRecord.work_late_delta,
        ),
      } satisfies RecordsRowDTO,
    ];
  });

  return { issues, month, rows };
}

function createEmptyRecordRow(
  periodMonth: string,
  userId: string,
  cutiStockSnapshot: number,
): WorkerRecordRow {
  return {
    alpha_count: 0,
    alpha_delta: 0,
    break_late_delta: 0,
    break_late_seconds: 0,
    cuti_stock_delta: 0,
    cuti_stock_snapshot: cutiStockSnapshot,
    last_source: null,
    last_source_action: null,
    lembur_delta: 0,
    lembur_units: 0,
    pending_days: 0,
    pending_delta: 0,
    period_month: periodMonth,
    sakit_days: 0,
    sakit_delta: 0,
    updated_at: null,
    user_id: userId,
    work_late_delta: 0,
    work_late_seconds: 0,
  };
}

function getRecordsRoleShiftLabel(role: WorkerRole, shift: WorkerShift): string {
  if (shift === "flexible") {
    return `${role} • Flexible`;
  }

  return `${role}-${shift}`;
}

function getCompactRecordsRoleShiftLabel(
  role: WorkerRole,
  shift: WorkerShift,
): string {
  const compactRole = compactRoleLabels[role];

  if (shift === "flexible") {
    return `${compactRole} • Flexible`;
  }

  return `${compactRole}-${shift}`;
}

function getRecordsShiftTimeLabel(shift: WorkerShift): string | null {
  const definition = getShiftDefinition(shift);

  if (
    definition.isFlexible ||
    definition.startHour === null ||
    definition.endHour === null
  ) {
    return null;
  }

  const start = formatShiftTime(
    definition.startHour,
    definition.startMinute ?? 0,
  );
  const end = formatShiftTime(
    definition.endHour,
    definition.endMinute ?? 0,
  );

  return `${start}\u2013${end}`;
}

function formatShiftTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseRecordSource(value: string | null): WorkerAttendanceSource | null {
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
