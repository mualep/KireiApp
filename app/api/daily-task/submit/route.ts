import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { logAudit } from "@/lib/audit-logger";

const submitTaskSchema = z.object({
  task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
  shift_label: z.string().min(1, "Shift label is required"),
  stream_name: z.string().trim().nullable().optional(),
  selected_games: z.array(z.string()).default([]),
  checklist_answers: z.record(z.string(), z.any()).default({}),
  ss_before_time: z.string().trim().nullable().optional(),
  ss_after_time: z.string().trim().nullable().optional(),
  process_duration_minutes: z.number().int().nonnegative().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = submitTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { 
      task_date, 
      shift_label, 
      stream_name, 
      selected_games, 
      checklist_answers,
      ss_before_time,
      ss_after_time,
      process_duration_minutes
    } = parsed.data;

    const supabase = await createClient();

    // 1. Fetch active checklist configurations
    const { data: configs, error: configError } = await supabase
      .from("daily_task_config")
      .select("id, game, phase, sort_order, label")
      .eq("is_active", true);

    if (configError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch template: ${configError.message}` },
        { status: 422 }
      );
    }

    // 2. Fetch shift active start time from worker_status
    const { data: statusRow } = await supabase
      .from("worker_status")
      .select("shift_active_started_at")
      .eq("user_id", staff.profile.id)
      .maybeSingle();

    const baseTime = statusRow?.shift_active_started_at
      ? new Date(statusRow.shift_active_started_at)
      : new Date();

    const editableUntil = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000);

    // 3. Insert new daily task submission
    const { data, error: insertError } = await supabase
      .from("daily_tasks")
      .insert({
        user_id: staff.profile.id,
        task_date,
        shift_label,
        stream_name: stream_name || null,
        selected_games,
        checklist_snapshot: configs || [],
        checklist_answers,
        status: "pending_review",
        submitted_at: new Date().toISOString(),
        editable_until: editableUntil.toISOString(),
        ss_before_time: ss_before_time || null,
        ss_after_time: ss_after_time || null,
        process_duration_minutes: typeof process_duration_minutes === "number" ? process_duration_minutes : null,
      })
      .select("*")
      .single();

    if (insertError) {
      // Check for unique constraint violation (code 23505)
      if (insertError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Laporan tugas harian untuk tanggal ini sudah dibuat." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 422 }
      );
    }

    await logAudit(staff.profile.id, "daily_task", "create", staff.profile.id, {
      task_id: data.id,
      task_date: data.task_date,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
