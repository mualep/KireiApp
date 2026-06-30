"use server";

import { revalidatePath } from "next/cache";

import { getCurrentStaffUser } from "@/lib/auth/staff";
import { applyRecordsOverrideMutation } from "@/lib/records/overrides";
import { createClient } from "@/lib/supabase/server";

export async function applyRecordsOverride(input: unknown) {
  const staff = await getCurrentStaffUser();

  if (!staff || staff.profile.tier === "member") {
    return { ok: false, error: "Unauthorized." };
  }

  const result = await applyRecordsOverrideMutation(input);

  if (!result.ok) {
    return { ok: false, error: result.error, fieldErrors: result.fieldErrors };
  }

  revalidatePath("/admin/records");

  return { ok: true, data: result.data };
}

export async function resetRecords(monthParam: string) {
  const staff = await getCurrentStaffUser();

  if (!staff || staff.profile.tier !== "owner") {
    return { ok: false, error: "Unauthorized." };
  }

  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return { ok: false, error: "Format bulan tidak valid." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("reset_records", {
    p_period_month: `${monthParam}-01`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/records");

  return { ok: true };
}
