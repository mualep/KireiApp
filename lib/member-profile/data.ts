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

export type MemberProfileDataStaff = {
  profile: {
    email: string;
    id: string;
    name: string;
    tier: StaffTier;
  };
};

export type MemberProfileWorkerDTO = {
  cutiStock: number;
  employeeRole: WorkerRole;
  roleShiftLabel: string;
  shift: WorkerShift;
  shiftTimeLabel: string | null;
};

export type MemberProfileDataResult = {
  issues: string[];
  staff: MemberProfileDataStaff["profile"];
  workerProfile: MemberProfileWorkerDTO | null;
};

type WorkerProfileRow = {
  cuti_stock: number;
  employee_role: string;
  shift: string;
  user_id: string;
};

export async function getMemberProfileData(
  staff: MemberProfileDataStaff,
): Promise<MemberProfileDataResult> {
  const supabase = await createClient();
  const { data: workerProfile, error } = await supabase
    .from("worker_profiles")
    .select("user_id,employee_role,shift,cuti_stock")
    .eq("user_id", staff.profile.id)
    .maybeSingle();

  if (error) {
    throw new Error("Self worker profile could not load.");
  }

  const issues: string[] = [];
  const profile = workerProfile as WorkerProfileRow | null;

  if (!profile) {
    return {
      issues: ["No worker profile is linked to this staff account yet."],
      staff: staff.profile,
      workerProfile: null,
    };
  }

  if (!isWorkerRole(profile.employee_role) || !isWorkerShift(profile.shift)) {
    issues.push("Worker role or shift is not readable yet.");

    return {
      issues,
      staff: staff.profile,
      workerProfile: null,
    };
  }

  return {
    issues,
    staff: staff.profile,
    workerProfile: {
      cutiStock: profile.cuti_stock,
      employeeRole: profile.employee_role,
      roleShiftLabel: getRoleShiftLabel(profile.employee_role, profile.shift),
      shift: profile.shift,
      shiftTimeLabel: getShiftTimeLabel(profile.shift),
    },
  };
}

function getRoleShiftLabel(role: WorkerRole, shift: WorkerShift): string {
  if (shift === "flexible") {
    return `${role} • Flexible`;
  }

  return `${role}-${shift}`;
}

function getShiftTimeLabel(shift: WorkerShift): string | null {
  const definition = getShiftDefinition(shift);

  if (
    definition.isFlexible ||
    definition.startHour === null ||
    definition.endHour === null
  ) {
    return null;
  }

  const start = `${String(definition.startHour).padStart(2, "0")}:${String(definition.startMinute ?? 0).padStart(2, "0")}`;
  const end = `${String(definition.endHour).padStart(2, "0")}:${String(definition.endMinute ?? 0).padStart(2, "0")}`;

  return `${start}\u2013${end}`;
}
