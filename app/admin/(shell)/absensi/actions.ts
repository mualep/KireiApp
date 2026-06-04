"use server";

import { revalidatePath } from "next/cache";

import {
  applyAbsensiCorrectionMutation,
  type ApplyAbsensiCorrectionResult,
} from "@/lib/absensi/corrections";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export async function applyAbsensiCorrection(
  input: unknown,
): Promise<ApplyAbsensiCorrectionResult> {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    return {
      error: "unauthenticated",
      ok: false,
    };
  }

  if (staff.profile.tier !== "owner" && staff.profile.tier !== "admin") {
    return {
      error: "unauthorized",
      ok: false,
    };
  }

  const result = await applyAbsensiCorrectionMutation(input);

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/absensi");

  return result;
}
