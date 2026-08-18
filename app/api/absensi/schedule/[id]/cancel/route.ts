import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "admin" && staff.profile.tier !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Membutuhkan hak akses Admin/Owner." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const scheduleId = resolvedParams.id;

    if (!scheduleId || typeof scheduleId !== "string") {
      return NextResponse.json(
        { success: false, error: "ID Penjadwalan tidak valid" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("cancel_scheduled_attendance", {
      p_schedule_id: scheduleId,
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
      target_user_id: data?.user_id || null,
      domain: "absensi",
      action: "schedule.cancel",
      payload_json: {
        schedule_id: scheduleId,
        status: data?.status,
        target_date: data?.target_date,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
