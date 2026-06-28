"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workerRoles, workerShifts } from "@/lib/workers/constants";
import { staffTierSchema } from "@/lib/auth/tiers";
import { getWorkerSpLogs } from "@/lib/users/data";

const createWorkerSchema = z.object({
  cutiStock: z.number().int().min(0),
  email: z.string().email(),
  employeeRole: z.enum(workerRoles),
  gid: z.string().min(1),
  isFlexible: z.boolean(),
  name: z.string().min(1),
  password: z.string().min(6),
  shift: z.enum(workerShifts),
  tier: staffTierSchema,
});

const editWorkerSchema = z.object({
  cutiStock: z.number().int().min(0),
  employeeRole: z.enum(workerRoles),
  gid: z.string().min(1),
  isFlexible: z.boolean(),
  name: z.string().min(1),
  shift: z.enum(workerShifts),
  tier: staffTierSchema,
});

async function requirePrivilegedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("users.unauthorized");
  const { data: profile } = await supabase.from("users").select("tier").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.tier)) {
    throw new Error("users.unauthorized");
  }
}

export async function createWorker(payload: unknown) {
  try {
    await requirePrivilegedUser();

    const parsed = createWorkerSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: "Invalid payload" };
    const {
      cutiStock,
      email,
      employeeRole,
      gid,
      isFlexible,
      name,
      password,
      shift,
      tier,
    } = parsed.data;

    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
    });

    if (authError || !authData.user) {
      return { ok: false, error: authError?.message || "Failed to create auth user" };
    }

    const supabase = await createClient();
    const { error: insertUserError } = await supabase.from("users").insert({
      email,
      id: authData.user.id,
      is_deleted: false,
      name,
      tier,
    });
    if (insertUserError) return { ok: false, error: insertUserError.message };

    const { error: insertProfileError } = await supabase.from("worker_profiles").insert({
      cuti_stock: cutiStock,
      employee_role: employeeRole,
      gid,
      is_flexible: isFlexible,
      shift,
      show_card: true,
      user_id: authData.user.id,
    });
    if (insertProfileError) return { ok: false, error: insertProfileError.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function editWorker(userId: string, payload: unknown) {
  try {
    await requirePrivilegedUser();

    const parsed = editWorkerSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: "Invalid payload" };
    const { cutiStock, employeeRole, gid, isFlexible, name, shift, tier } = parsed.data;

    const supabase = await createClient();

    // Check if shift changed
    const { data: oldProfile } = await supabase
      .from("worker_profiles")
      .select("shift")
      .eq("user_id", userId)
      .single();

    const { error: userError } = await supabase
      .from("users")
      .update({ name, tier })
      .eq("id", userId);
    if (userError) return { ok: false, error: userError.message };

    const { error: profileError } = await supabase
      .from("worker_profiles")
      .update({
        cuti_stock: cutiStock,
        employee_role: employeeRole,
        gid,
        is_flexible: isFlexible,
        shift,
      })
      .eq("user_id", userId);
    if (profileError) return { ok: false, error: profileError.message };

    if (oldProfile && oldProfile.shift !== shift) {
      await supabase
        .from("worker_status")
        .update({
          shift_active_end_hour: null,
          shift_active_end_min: null,
          shift_active_label: null,
          shift_active_start_hour: null,
          shift_active_start_min: null,
        })
        .eq("user_id", userId);
    }

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deactivateWorker(userId: string) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("deactivate_worker", { p_target_user_id: userId });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function reactivateWorker(userId: string) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("reactivate_worker", { p_target_user_id: userId });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function issueSp(
  userId: string,
  level: number,
  reason: string,
  expiresAt: string,
) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("issue_worker_sp", {
      p_expires_at: expiresAt,
      p_reason: reason,
      p_sp_level: level,
      p_target_user_id: userId,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function revokeSp(spId: string) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_worker_sp", { p_sp_id: spId });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function fetchWorkerSpLogsAction(userId: string) {
  try {
    await requirePrivilegedUser();
    const data = await getWorkerSpLogs(userId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
