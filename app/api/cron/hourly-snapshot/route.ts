import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleCronRequest(request: NextRequest) {
  try {
    // 1. Validate Cron Secret if set in environment
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const urlSecret =
      request.nextUrl.searchParams.get("secret") ||
      request.nextUrl.searchParams.get("key");

    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret) {
      const cleanExpected = expectedSecret.trim();
      const cleanHeader = authHeader?.replace(/^Bearer\s+/i, "").trim();
      const cleanUrl = urlSecret?.trim();

      const isValidHeader = cleanHeader === cleanExpected;
      const isValidUrl = cleanUrl === cleanExpected;

      if (!isValidHeader && !isValidUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
            message: "Invalid or missing CRON_SECRET in authorization header or url query parameter.",
          },
          { status: 401 }
        );
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

    // 3. Use Admin Client for automated background cron (bypasses RLS without requiring browser cookies)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    // 4. Fetch active member worker statuses
    const { data: memberUsers, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("tier", "member")
      .eq("is_deleted", false);

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to query users table: ${userError.message}`,
          details: userError,
        },
        { status: 500 }
      );
    }

    const memberUserIds = (memberUsers || []).map((u) => u.id);

    const { data: statusRows, error: statusError } =
      memberUserIds.length > 0
        ? await supabase
            .from("worker_status")
            .select("current_status")
            .in("user_id", memberUserIds)
        : { data: [], error: null };

    if (statusError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to query worker_status table: ${statusError.message}`,
          details: statusError,
        },
        { status: 500 }
      );
    }

    // 5. Group worker counts by current_status
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

    // 6. Upsert snapshot into activity_snapshots table
    const { data, error: upsertError } = await supabase
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
      .maybeSingle();

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to upsert activity_snapshots: ${upsertError.message}`,
          details: upsertError,
        },
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
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      {
        success: false,
        error: message,
        stack,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

export async function HEAD(request: NextRequest) {
  return handleCronRequest(request);
}
