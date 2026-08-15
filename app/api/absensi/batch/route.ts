import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

const absensiCellItemSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["hadir", "cuti", "sakit", "pending", "alpha"]),
  notes: z.string().trim().max(100).nullable().optional(),
});

const absensiBatchSchema = z.object({
  items: z.array(absensiCellItemSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = absensiBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const results = [];
    const errors = [];

    for (const item of parsed.data.items) {
      const { user_id, date, status, notes } = item;
      const { data, error } = await supabase.rpc("sync_absensi_edit", {
        p_target_user_id: user_id,
        p_date: date,
        p_status: status,
        p_notes: notes ?? null,
      });

      if (error) {
        errors.push({ user_id, date, error: error.message });
      } else if (data && typeof data === "object" && "ok" in data && !(data as { ok?: boolean }).ok) {
        errors.push({ user_id, date, error: (data as { message?: string }).message || "Edit failed" });
      } else {
        results.push({ user_id, date, data });
      }
    }

    revalidatePath("/admin/absensi");
    revalidatePath("/admin/tracker");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Some items failed to process", errors, results },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, processedCount: results.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
