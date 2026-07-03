"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workerRoles, workerShifts, workerShiftDefinitions } from "@/lib/workers/constants";
import { getWorkerSpLogs } from "@/lib/users/data";
import { redis } from "@/lib/redis/client";

// Constraint: worker_profiles_flexible_shift_shape_check
// flexible shift => is_flexible=true, all hour fields NULL
// non-flexible   => is_flexible=false, all four hour fields NOT NULL
function getShiftFields(shift: string) {
  const def = workerShiftDefinitions[shift as keyof typeof workerShiftDefinitions];
  if (!def || def.isFlexible) {
    return {
      is_flexible: true,
      shift_end_hour: null,
      shift_end_min: null,
      shift_start_hour: null,
      shift_start_min: null,
    };
  }
  return {
    is_flexible: false,
    shift_end_hour: def.endHour,
    shift_end_min: def.endMinute,
    shift_start_hour: def.startHour,
    shift_start_min: def.startMinute,
  };
}

// Business rule: Customer Service → admin, everyone else → member
function deriveTierFromRole(role: string): "admin" | "member" {
  return role === "Customer Service" ? "admin" : "member";
}

const createWorkerSchema = z.object({
  email: z.string().email(),
  employeeRole: z.enum(workerRoles),
  name: z.string().min(1),
  password: z.string().min(6),
  shift: z.enum(workerShifts),
});

const editWorkerSchema = z.object({
  email: z.string().email().optional(),
  employeeRole: z.enum(workerRoles),
  name: z.string().min(1),
  newPassword: z.string().min(6).optional().or(z.literal("")),
  shift: z.enum(workerShifts),
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
    if (!parsed.success) {
      return { ok: false, error: "Payload tidak valid: " + parsed.error.issues.map((i) => i.message).join(", ") };
    }
    const { email, employeeRole, name, password, shift } = parsed.data;

    const tier = deriveTierFromRole(employeeRole);
    const shiftFields = getShiftFields(shift);

    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
    });

    if (authError || !authData.user) {
      return { ok: false, error: authError?.message || "Gagal membuat akun auth" };
    }

    const { error: insertUserError } = await adminClient.from("users").insert({
      email,
      id: authData.user.id,
      is_deleted: false,
      name,
      tier,
    });
    if (insertUserError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { ok: false, error: insertUserError.message };
    }

    const { error: insertProfileError } = await adminClient.from("worker_profiles").insert({
      cuti_stock: 0,
      employee_role: employeeRole,
      shift,
      show_card: true,
      user_id: authData.user.id,
      ...shiftFields,
    });
    if (insertProfileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { ok: false, error: insertProfileError.message };
    }

    const { error: insertStatusError } = await adminClient.from("worker_status").insert({
      current_status: "off",
      user_id: authData.user.id,
    });
    if (insertStatusError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { ok: false, error: insertStatusError.message };
    }

    await redis.del("cache:worker_profiles:active");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
  }
}

export async function editWorker(userId: string, payload: unknown) {
  try {
    await requirePrivilegedUser();

    const parsed = editWorkerSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: "Payload tidak valid: " + parsed.error.issues.map((i) => i.message).join(", ") };
    }
    const { email, employeeRole, name, newPassword, shift } = parsed.data;

    const tier = deriveTierFromRole(employeeRole);
    const shiftFields = getShiftFields(shift);

    const adminClient = createAdminClient();

    // Check if shift changed (read-only, ok to use user client)
    const supabase = await createClient();
    const { data: oldProfile } = await supabase
      .from("worker_profiles")
      .select("shift")
      .eq("user_id", userId)
      .single();

    // Update auth user email/password via Service Role if provided
    if (email || (newPassword && newPassword.length > 0)) {
      const authUpdate: { email?: string; password?: string } = {};
      if (email) authUpdate.email = email;
      if (newPassword && newPassword.length > 0) authUpdate.password = newPassword;
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate);
      if (authError) return { ok: false, error: authError.message };
    }

    // Update users table via admin client (bypasses RLS)
    const userUpdate: { name: string; tier: string; email?: string } = { name, tier };
    if (email) userUpdate.email = email;

    const { error: userError } = await adminClient
      .from("users")
      .update(userUpdate)
      .eq("id", userId);
    if (userError) return { ok: false, error: userError.message };

    // Update worker_profiles via admin client (bypasses RLS)
    // Do NOT update cuti_stock — managed exclusively in Records
    const { error: profileError } = await adminClient
      .from("worker_profiles")
      .update({
        employee_role: employeeRole,
        shift,
        ...shiftFields,
      })
      .eq("user_id", userId);
    if (profileError) return { ok: false, error: profileError.message };

    // Reset shift status if shift changed
    if (oldProfile && oldProfile.shift !== shift) {
      await adminClient
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

    await redis.del("cache:worker_profiles:active");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
  }
}

export async function deactivateWorker(userId: string) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("deactivate_worker", { p_target_user_id: userId });
    if (error) return { ok: false, error: error.message };

    await redis.del("cache:worker_profiles:active");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
  }
}

export async function reactivateWorker(userId: string) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("reactivate_worker", { p_target_user_id: userId });
    if (error) return { ok: false, error: error.message };

    await redis.del("cache:worker_profiles:active");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
  }
}

export async function issueSp(
  userId: string,
  reason: string,
  expiresAt: string,
) {
  try {
    await requirePrivilegedUser();
    const supabase = await createClient();
    const { error } = await supabase.rpc("issue_worker_sp", {
      p_expires_at: expiresAt,
      p_reason: reason,
      p_sp_level: 1,
      p_target_user_id: userId,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
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
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
  }
}

export async function fetchWorkerSpLogsAction(userId: string) {
  try {
    await requirePrivilegedUser();
    const data = await getWorkerSpLogs(userId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan" };
  }
}
