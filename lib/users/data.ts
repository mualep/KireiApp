import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StaffTier } from "@/lib/auth/tiers";
import type { WorkerRole, WorkerShift, WorkerStoredStatus } from "@/lib/workers";

export type UsersManagerRowDTO = {
  activeSpCount: number;
  email: string;
  employeeRole: WorkerRole | null;
  gid: string | null;
  id: string;
  isDeleted: boolean;
  name: string;
  shift: WorkerShift | null;
  status: WorkerStoredStatus | null;
  tier: StaffTier;
};

export type SpLogDTO = {
  expiresAt: string;
  id: string;
  issuedAt: string;
  issuedBy: string;
  reason: string;
  revokedAt: string | null;
  revokedBy: string | null;
  spLevel: number;
  userId: string;
};

export async function getUsersManagerList(): Promise<UsersManagerRowDTO[]> {
  const supabase = await createClient();

  const [usersRes, profilesRes, statusesRes, spsRes] = await Promise.all([
    supabase.from("users").select("id, name, email, tier, is_deleted").neq("tier", "owner"),
    supabase.from("worker_profiles").select("user_id, gid, employee_role, shift"),
    supabase.from("worker_status").select("user_id, status"),
    supabase
      .from("worker_sp_logs")
      .select("user_id, sp_level")
      .gt("expires_at", new Date().toISOString())
      .is("revoked_at", null),
  ]);

  if (usersRes.error) throw new Error("Users could not load.");

  const profilesMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const statusMap = new Map((statusesRes.data ?? []).map((s) => [s.user_id, s.status]));

  const spsCountMap = new Map<string, number>();
  for (const sp of spsRes.data ?? []) {
    spsCountMap.set(sp.user_id, (spsCountMap.get(sp.user_id) ?? 0) + 1);
  }

  return usersRes.data
    .map((u) => {
      const profile = profilesMap.get(u.id);
      return {
        activeSpCount: spsCountMap.get(u.id) ?? 0,
        email: u.email,
        employeeRole: (profile?.employee_role as WorkerRole) ?? null,
        gid: profile?.gid ?? null,
        id: u.id,
        isDeleted: u.is_deleted,
        name: u.name,
        shift: (profile?.shift as WorkerShift) ?? null,
        status: (statusMap.get(u.id) as WorkerStoredStatus) ?? null,
        tier: u.tier as StaffTier,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getWorkerSpLogs(userId: string): Promise<SpLogDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worker_sp_logs")
    .select("*")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });

  if (error) throw new Error("SP logs could not load.");

  return (data ?? []).map((row) => ({
    expiresAt: row.expires_at,
    id: row.id,
    issuedAt: row.issued_at,
    issuedBy: row.issued_by,
    reason: row.reason,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    spLevel: row.sp_level,
    userId: row.user_id,
  }));
}
