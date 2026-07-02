"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const updateCredentialsSchema = z.object({
  emailPrefix: z
    .string()
    .min(1, "Prefix email tidak boleh kosong")
    .regex(/^[a-zA-Z0-9._-]+$/, "Prefix email hanya boleh berisi huruf, angka, titik, strip, atau underscore"),
  newPassword: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .optional()
    .or(z.literal("")),
});

export type UpdateCredentialsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateOwnCredentials(payload: unknown): Promise<UpdateCredentialsResult> {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    // 2. Validate input
    const parsed = updateCredentialsSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Data tidak valid: " + parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const { emailPrefix, newPassword } = parsed.data;
    const fullEmail = `${emailPrefix.trim().toLowerCase()}@kireiku.app`;

    // 3. Update auth user and public users table using service role client
    const adminClient = createAdminClient();

    const authUpdate: { email: string; password?: string } = {
      email: fullEmail,
    };
    if (newPassword && newPassword.length >= 6) {
      authUpdate.password = newPassword;
    }

    const { error: authError } = await adminClient.auth.admin.updateUserById(
      user.id,
      authUpdate
    );
    if (authError) {
      return { ok: false, error: authError.message };
    }

    // 4. Update the email in public.users table
    const { error: userError } = await adminClient
      .from("users")
      .update({ email: fullEmail })
      .eq("id", user.id);
    if (userError) {
      return { ok: false, error: userError.message };
    }

    // 5. Write to audit logs using the user client (sets correct actor)
    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_domain: "profile",
      p_action: "profile.update_credentials",
      p_target_table: "users",
      p_target_id: user.id,
      p_target_user_id: user.id,
      p_payload: {
        email: fullEmail,
        has_password: !!(newPassword && newPassword.length >= 6),
      },
    });

    if (auditError) {
      console.error("Failed to write profile credentials update audit log:", auditError.message);
    }

    revalidatePath("/admin/profile");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui",
    };
  }
}
