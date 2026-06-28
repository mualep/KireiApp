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
  name: z.string().min(1),
  password: z.string().min(6),
  shift: z.enum(workerShifts),
  tier: staffTierSchema,
});

const editWorkerSchema = z.object({
  cutiStock: z.number().int().min(0),
  email: z.string().email().optional(),
  employeeRole: z.enum(workerRoles),
  name: z.string().min(1),
  newPassword: z.string().min(6).optional().or(z.literal("")),
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
    if (!parsed.success) return { ok: false, error: "Payload tidak valid: " + parsed.error.issues.map(i => i.message).join(", ") };
    const {
      cutiStock,
      email,
      employeeRole,
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
      // Rollback auth user on failure
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { ok: false, error: insertUserError.message };
    }

    const { error: insertProfileError } = await adminClient.from("worker_profiles").insert({
      cuti_stock: cutiStock,
      employee_role: employeeRole,
      is_flexible: shift === "flexible",
      shift,
      show_card: true,
      user_id: authData.user.id,
    });
    if (insertProfileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { ok: false, error: insertProfileError.message };
    }

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
    if (!parsed.success) return { ok: false, error: "Payload tidak valid: " + parsed.error.issues.map(i => i.message).join(", ") };
    const { cutiStock, email, employeeRole, name, newPassword, shift, tier } = parsed.data;

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
    const { error: profileError } = await adminClient
      .from("worker_profiles")
      .update({
        cuti_stock: cutiStock,
        employee_role: employeeRole,
        is_flexible: shift === "flexible",
        shift,
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
