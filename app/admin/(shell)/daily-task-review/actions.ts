"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export type SubmitKompensasiInput = {
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

    const { userId, dailyTaskId, taskDate, hours, minutes, reason, proofUrl } = input;

    if (!userId || !taskDate || !reason.trim()) {
      return { ok: false, error: "Semua data wajib diisi (Pekerja, Tanggal, dan Alasan)." };
    }

    const totalHours = Number(hours) || 0;
    const totalMins = Number(minutes) || 0;
    const totalDurationMins = Math.max(0, totalHours * 60 + totalMins);

    if (totalDurationMins <= 0) {
      return { ok: false, error: "Durasi kompensasi harus lebih dari 0 menit." };
    }

    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days retention

    // 1. Insert into worker_kompensasi
    const { error: kompenError } = await supabase.from("worker_kompensasi").insert({
      user_id: userId,
      daily_task_id: dailyTaskId || null,
      date: taskDate,
      duration_minutes: totalDurationMins,
      reason: reason.trim(),
      proof_url: proofUrl?.trim() || null,
      created_by: staff.profile.id,
      expires_at: expiresAt,
    });

    if (kompenError) {
      return { ok: false, error: `Gagal mencatat kompensasi: ${kompenError.message}` };
    }

    // 2. Sync to worker_records for the month
    const periodMonth = `${taskDate.slice(0, 7)}-01`;

    const { data: existingRecord } = await supabase
      .from("worker_records")
      .select("kompensasi_duration_mins, kompensasi_delta_mins")
      .eq("user_id", userId)
      .eq("period_month", periodMonth)
      .maybeSingle();

    if (existingRecord) {
      await supabase
        .from("worker_records")
        .update({
          kompensasi_duration_mins: (existingRecord.kompensasi_duration_mins || 0) + totalDurationMins,
          last_source: "daily_task",
          last_source_action: "kompensasi",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("period_month", periodMonth);
    } else {
      await supabase.from("worker_records").insert({
        user_id: userId,
        period_month: periodMonth,
        kompensasi_duration_mins: totalDurationMins,
        kompensasi_delta_mins: 0,
        work_late_seconds: 0,
        break_late_seconds: 0,
        alpha_count: 0,
        sakit_days: 0,
        pending_days: 0,
        lembur_units: 0,
        cuti_stock_snapshot: 0,
        last_source: "daily_task",
        last_source_action: "kompensasi",
      });
    }

    // 3. Write audit log
    await supabase.from("audit_logs").insert({
      actor_user_id: staff.profile.id,
      target_user_id: userId,
      domain: "daily_task",
      action: "daily_task.kompensasi",
      payload_json: {
        daily_task_id: dailyTaskId,
        task_date: taskDate,
        duration_minutes: totalDurationMins,
        hours: totalHours,
        minutes: totalMins,
        reason: reason.trim(),
        proof_url: proofUrl?.trim() || null,
      },
    });

    revalidatePath("/admin/daily-task-review");
    revalidatePath("/admin/records");
    revalidatePath("/admin/performance");

    return { ok: true, durationMinutes: totalDurationMins };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses kompensasi.",
    };
  }
}
