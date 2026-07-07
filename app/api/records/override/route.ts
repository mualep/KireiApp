import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

const recordsOverrideSchema = z.object({
  user_id: z.string().uuid(),
  period_month: z.string().regex(/^\d{4}-\d{2}-01$/, "Must be the first day of the month"),
  field_name: z.enum([
    "work_late_override_seconds",
    "break_late_override_seconds",
    "alpha_override_count",
    "sakit_override_days",
    "pending_override_days",
    "lembur_override_units",
    "cuti_stock_override_snapshot",
    "work_late_seconds",
    "break_late_seconds",
    "alpha_count",
    "sakit_days",
    "pending_days",
    "lembur_units",
    "cuti_stock_snapshot"
  ]),
  desired_value: z.number().min(0),
  reason: z.string().trim().max(50).nullable().optional(),
});

async function handleRequest(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = recordsOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { user_id, period_month, field_name, desired_value, reason } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("apply_records_delta_override", {
      p_target_user_id: user_id,
      p_period_month: period_month,
      p_field_name: field_name,
      p_desired_value: desired_value,
      p_reason: reason ?? null,
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

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}
