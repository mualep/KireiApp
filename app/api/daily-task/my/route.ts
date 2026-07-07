import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export async function GET(request: NextRequest) {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "Invalid date parameter" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: task, error } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", staff.profile.id)
      .eq("task_date", date)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
