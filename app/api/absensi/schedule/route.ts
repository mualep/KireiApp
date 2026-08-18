import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createScheduleSchema = z.object({
  user_id: z.string().uuid("ID Pekerja tidak valid"),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  status: z.enum(["cuti", "sakit", "pending", "alpha"], {
    message: "Status penjadwalan harus cuti, sakit, pending, atau alpha",
  }),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "admin" && staff.profile.tier !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Membutuhkan hak akses Admin/Owner." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const payload = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("create_scheduled_attendance", {
      p_user_id: payload.user_id,
      p_target_date: payload.target_date,
      p_status: payload.status,
      p_notes: payload.notes || null,
      p_admin_id: staff.profile.id,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      actor_user_id: staff.profile.id,
      target_user_id: payload.user_id,
      domain: "absensi",
      action: "schedule.create",
      payload_json: {
        target_date: payload.target_date,
        status: payload.status,
        notes: payload.notes || null,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    let query = supabase
      .from("scheduled_attendance")
      .select(`
        id,
        user_id,
        target_date,
        status,
        scheduled_by,
        scheduled_at,
        applied_at,
        cancelled_at,
        cancelled_by,
        notes,
        created_at,
        updated_at,
        worker:users!scheduled_attendance_user_id_fkey(name),
        scheduler:users!scheduled_attendance_scheduled_by_fkey(name)
      `)
      .is("applied_at", null)
      .is("cancelled_at", null)
      .order("target_date", { ascending: true });

    if (staff.profile.tier === "member") {
      query = query.eq("user_id", staff.profile.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const formatted = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      worker_name: row.worker?.name || "Unknown",
      target_date: row.target_date,
      status: row.status,
      scheduled_by: row.scheduled_by,
      scheduler_name: row.scheduler?.name || "System",
      scheduled_at: row.scheduled_at,
      applied_at: row.applied_at,
      cancelled_at: row.cancelled_at,
      cancelled_by: row.cancelled_by,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
