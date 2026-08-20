"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export type SubmitKompensasiInput = {
  id?: string | null;
  userId: string;
  dailyTaskId?: string | null;
  taskDate: string; // YYYY-MM-DD
  hours: number;
  minutes: number;
  reason: string;
  proofUrl?: string | null;
};

export async function submitKompensasiAction(input: SubmitKompensasiInput) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return { ok: false, error: "Hanya Admin atau Owner yang dapat memberikan kompensasi." };
    }

    const { id, userId, dailyTaskId, taskDate, hours, minutes, reason, proofUrl } = input;

    if (!userId || !taskDate || !reason?.trim()) {
      return { ok: false, error: "Semua data wajib diisi (Pekerja, Tanggal, dan Alasan)." };
    }

    const totalHours = Number(hours) || 0;
    const totalMins = Number(minutes) || 0;
    const totalDurationMins = Math.max(0, totalHours * 60 + totalMins);

    if (totalDurationMins <= 0) {
      return { ok: false, error: "Durasi kompensasi harus lebih dari 0 menit." };
    }

    // Clean up dailyTaskId if placeholder
    const cleanDailyTaskId =
      dailyTaskId && !dailyTaskId.startsWith("placeholder-") && dailyTaskId !== "dummy"
        ? dailyTaskId
        : null;

    const supabase = await createClient();

    const { data: rpcResult, error: rpcError } = await supabase.rpc("upsert_kompensasi", {
      p_id: id || null,
      p_user_id: userId,
      p_daily_task_id: cleanDailyTaskId,
      p_date: taskDate,
      p_duration_minutes: totalDurationMins,
      p_reason: reason.trim(),
      p_proof_url: proofUrl?.trim() || null,
    });

    if (rpcError) {
      return { ok: false, error: `Gagal memproses kompensasi: ${rpcError.message}` };
    }

    revalidatePath("/admin/daily-task-review");
    revalidatePath("/admin/records");
    revalidatePath("/admin/performance");

    return {
      ok: true,
      id: rpcResult?.id || id,
      durationMinutes: totalDurationMins,
      delta: rpcResult?.delta ?? totalDurationMins,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses kompensasi.",
    };
  }
}

export async function deleteKompensasiAction(id: string, userId: string) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return { ok: false, error: "Hanya Admin atau Owner yang dapat menghapus kompensasi." };
    }

    if (!id || !userId) {
      return { ok: false, error: "ID Kompensasi dan User ID wajib disertakan." };
    }

    const supabase = await createClient();
    const { data: rpcResult, error: rpcError } = await supabase.rpc("delete_kompensasi", {
      p_id: id,
      p_user_id: userId,
    });

    if (rpcError) {
      return { ok: false, error: `Gagal menghapus kompensasi: ${rpcError.message}` };
    }

    revalidatePath("/admin/daily-task-review");
    revalidatePath("/admin/records");
    revalidatePath("/admin/performance");

    return {
      ok: true,
      id,
      deletedDurationMinutes: rpcResult?.deleted_duration_minutes ?? 0,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus kompensasi.",
    };
  }
}
