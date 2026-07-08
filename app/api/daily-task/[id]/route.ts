import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

const updateTaskSchema = z.object({
  stream_name: z.string().trim().nullable().optional(),
  selected_games: z.array(z.string()).optional(),
  checklist_answers: z.record(z.string(), z.any()).optional(),
  ss_before_time: z.string().trim().nullable().optional(),
  ss_after_time: z.string().trim().nullable().optional(),
  process_duration_minutes: z.number().int().nonnegative().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch current task record to enforce constraints
    const { data: task, error: getError } = await supabase
      .from("daily_tasks")
      .select("user_id, status, editable_until")
      .eq("id", id)
      .maybeSingle();

    if (getError) {
      return NextResponse.json(
        { success: false, error: getError.message },
        { status: 422 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const isWorker = staff.profile.tier !== "owner" && staff.profile.tier !== "admin";

    // 2. Enforce member-specific guards
    if (isWorker) {
      if (task.user_id !== staff.profile.id) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      if (task.status === "approved") {
        return NextResponse.json(
          { success: false, error: "Tugas harian sudah disetujui dan tidak dapat diubah." },
          { status: 403 }
        );
      }

      if (new Date() > new Date(task.editable_until)) {
        return NextResponse.json(
          { success: false, error: "Batas waktu pengisian sudah terlewat (12 jam)." },
          { status: 403 }
        );
      }
    }

    // 3. Perform update
    const { data, error: updateError } = await supabase
      .from("daily_tasks")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
