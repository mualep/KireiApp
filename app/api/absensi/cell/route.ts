import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

const absensiCellSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["hadir", "cuti", "sakit", "pending", "alpha"]),
  notes: z.string().trim().max(100).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = absensiCellSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { user_id, date, status, notes } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("sync_absensi_edit", {
      p_target_user_id: user_id,
      p_date: date,
      p_status: status,
      p_notes: notes ?? null,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
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
