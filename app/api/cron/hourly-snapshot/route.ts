import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // 1. Validate Cron Secret if set in environment
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        const urlSecret = request.nextUrl.searchParams.get("secret");
        if (urlSecret !== cronSecret) {
          return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
          );
        }
      }
    }

    // 2. Calculate current Date and Hour in WIB (Asia/Jakarta)
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
    }).format(now); // YYYY-MM-DD

    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).format(now); // 0-23
    const hourNum = Number(hourStr);

    const supabase = await createClient();

    // 3. Fetch active member worker statuses
    const { data: memberUsers } = await supabase
      .from("users")
      .select("id")
      .eq("tier", "member")
      .eq("is_deleted", false);

    const memberUserIds = (memberUsers || []).map((u) => u.id);

    const { data: statusRows } = memberUserIds.length > 0
      ? await supabase
          .from("worker_status")
          .select("current_status")
          .in("user_id", memberUserIds)
      : { data: [] };

    // 4. Group worker counts by current_status
    const statusCounts: Record<string, number> = {
      on: 0,
      break: 0,
      off: 0,
      late: 0,
      alpha: 0,
      sakit: 0,
      cuti: 0,
      pending: 0,
    };

    (statusRows || []).forEach((row) => {
      const statusKey = (row.current_status || "off").toLowerCase();
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    });

    // 5. Upsert snapshot into activity_snapshots table
    const { data, error } = await supabase
      .from("activity_snapshots")
      .upsert(
        {
          snapshot_date: dateStr,
          snapshot_hour: hourNum,
          status_counts: statusCounts,
        },
        { onConflict: "snapshot_date,snapshot_hour" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot_date: dateStr,
      snapshot_hour: hourNum,
      status_counts: statusCounts,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
