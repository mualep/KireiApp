import "server-only";

import type { StaffTier } from "@/lib/auth/tiers";
import { createClient } from "@/lib/supabase/server";
import {
  computeWorkerDisplayStatus,
  getShiftDefinition,
  isWorkerRole,
  isWorkerShift,
  isWorkerStoredStatus,
  type TrackerCardDTO,
} from "@/lib/workers";
import { scopeTrackerCards } from "@/lib/tracker/helpers";

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
  show_card: boolean;
  user_id: string;
};

type WorkerStatusRow = {
  alpha_done: boolean;
  current_status: string;
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

export async function getTrackerData(staff: TrackerDataStaff): Promise<TrackerDataResult> {
  const supabase = await createClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("worker_profiles")
    .select("user_id,gid,employee_role,shift,is_flexible,show_card,cuti_stock")
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
  const [{ data: users, error: usersError }, { data: statuses, error: statusesError }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id,name,email,is_deleted")
        .in("id", userIds)
        .returns<UserRow[]>(),
      supabase
        .from("worker_status")
        .select("user_id,version,current_status,alpha_done,updated_at")
        .in("user_id", userIds)
        .returns<WorkerStatusRow[]>(),
    ]);

  if (usersError) {
    throw new Error("Tracker users could not load.");
  }

  if (statusesError) {
    throw new Error("Tracker worker statuses could not load.");
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const statusesByUserId = new Map(
    (statuses ?? []).map((status) => [status.user_id, status]),
  );
  const issues: TrackerDataIssue[] = [];
  const now = new Date();
  const cards = profileRows.flatMap((profile) => {
    const user = usersById.get(profile.user_id);
    const status = statusesByUserId.get(profile.user_id);

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

    return [
      {
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
        isFlexible: profile.is_flexible,
        name: user.name,
        shift: profile.shift,
        showCard: profile.show_card,
        statusUpdatedAt: status.updated_at,
        storedStatus: status.current_status,
        userId: profile.user_id,
        version: Number(status.version),
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
