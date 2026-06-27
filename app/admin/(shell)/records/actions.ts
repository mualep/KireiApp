"use server";

import { revalidatePath } from "next/cache";

import { getCurrentStaffUser } from "@/lib/auth/staff";
import { applyRecordsOverrideMutation } from "@/lib/records/overrides";

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
