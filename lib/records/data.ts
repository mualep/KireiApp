import "server-only";

import type { StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";
import { isWorkerRole, type WorkerRole } from "@/lib/workers";
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
  alphaCount: EffectiveRecordMetric;
  breakLateSeconds: EffectiveRecordMetric;
  cutiStockSnapshot: EffectiveRecordMetric<number | null>;
  employeeRole: WorkerRole;
  gid: string;
  lastSource: WorkerAttendanceSource | null;
  lastSourceAction: string | null;
  lemburUnits: EffectiveRecordMetric;
  name: string;
  pendingDays: EffectiveRecordMetric;
  periodMonth: string;
  sakitDays: EffectiveRecordMetric;
  updatedAt: string;
  userId: string;
  workLateSeconds: EffectiveRecordMetric;
};

export type RecordsDataResult = {
  issues: RecordsDataIssue[];
  month: RecordsMonthRange;
  rows: RecordsRowDTO[];
};

type WorkerProfileRow = {
  employee_role: string;
  gid: string;
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
  alpha_override_count: number | null;
  break_late_override_seconds: number | null;
  break_late_seconds: number;
  cuti_stock_override_snapshot: number | null;
  cuti_stock_snapshot: number | null;
  last_source: string | null;
  last_source_action: string | null;
  lembur_override_units: number | null;
  lembur_units: number;
  pending_days: number;
  pending_override_days: number | null;
  period_month: string;
  sakit_days: number;
  sakit_override_days: number | null;
  updated_at: string;
  user_id: string;
  work_late_override_seconds: number | null;
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

export async function getRecordsData({
  monthParam,
  staff,
}: RecordsDataRequest): Promise<RecordsDataResult> {
  const month = getRecordsMonthRange(monthParam);
  const supabase = await createClient();

  let profilesQuery = supabase
    .from("worker_profiles")
    .select("user_id,gid,employee_role")
    .eq("show_card", true);

  if (staff.profile.tier === "member") {
    profilesQuery = profilesQuery.eq("user_id", staff.profile.id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery
    .order("gid", { ascending: true })
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
          "work_late_override_seconds",
          "break_late_override_seconds",
          "alpha_override_count",
          "sakit_override_days",
          "pending_override_days",
          "lembur_override_units",
          "cuti_stock_override_snapshot",
          "last_source",
          "last_source_action",
          "updated_at",
        ].join(","),
      )
      .in("user_id", userIds)
      .eq("period_month", month.monthStart)
      .order("user_id", { ascending: true })
      .returns<WorkerRecordRow[]>(),
  ]);

  if (usersError) {
    throw new Error("Records users could not load.");
  }

  if (recordsError) {
    throw new Error("Records rows could not load.");
  }

  const profilesByUserId = new Map(profileRows.map((profile) => [profile.user_id, profile]));
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const issues: RecordsDataIssue[] = [];

  const rows = (records ?? []).flatMap((record) => {
    const profile = profilesByUserId.get(record.user_id);
    const user = usersById.get(record.user_id);

    if (!profile) {
      issues.push({
        message: `Record for worker ${record.user_id} is missing a readable worker profile.`,
      });
      return [];
    }

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

    return [
      {
        alphaCount: getEffectiveRecordMetric(
          record.alpha_count,
          record.alpha_override_count,
        ),
        breakLateSeconds: getEffectiveRecordMetric(
          record.break_late_seconds,
          record.break_late_override_seconds,
        ),
        cutiStockSnapshot: getEffectiveRecordMetric(
          record.cuti_stock_snapshot,
          record.cuti_stock_override_snapshot,
        ),
        employeeRole: profile.employee_role,
        gid: profile.gid,
        lastSource: parseRecordSource(record.last_source),
        lastSourceAction: record.last_source_action,
        lemburUnits: getEffectiveRecordMetric(
          record.lembur_units,
          record.lembur_override_units,
        ),
        name: user.name,
        pendingDays: getEffectiveRecordMetric(
          record.pending_days,
          record.pending_override_days,
        ),
        periodMonth: record.period_month,
        sakitDays: getEffectiveRecordMetric(
          record.sakit_days,
          record.sakit_override_days,
        ),
        updatedAt: record.updated_at,
        userId: record.user_id,
        workLateSeconds: getEffectiveRecordMetric(
          record.work_late_seconds,
          record.work_late_override_seconds,
        ),
      } satisfies RecordsRowDTO,
    ];
  });

  return { issues, month, rows };
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
