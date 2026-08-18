import { NextResponse, type NextRequest } from "next/server";
import { redis } from "@/lib/redis/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET environment variable is not defined");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const isValid = authHeader === expectedSecret || authHeader === `Bearer ${expectedSecret}`;
  if (!isValid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const lockKey = "lock:cron:auto-trigger";
  const lockValue = Date.now().toString();
  let hasLock = false;

  try {
    // Distributed lock — cegah eksekusi overlap jika cron terlambat
    const acquired = await redis.set(lockKey, lockValue, { nx: true, px: 30000 });
    if (!acquired) {
      console.log("Cron overlap — skipped");
      return NextResponse.json({ message: "Cron overlap" }, { status: 200 });
    }
    hasLock = true;

    // Cek system_reset_at lockout (6 menit setelah manual reset)
    const systemResetAtStr = await redis.get<string>("system_reset_at");
    if (systemResetAtStr) {
      const systemResetAt = new Date(systemResetAtStr).getTime();
      if (!isNaN(systemResetAt)) {
        const timeSinceReset = Date.now() - systemResetAt;
        if (timeSinceReset < 6 * 60 * 1000) {
          console.log("CRON SKIPPED: POST_RESET_LOCKOUT");
          return NextResponse.json({ message: "CRON SKIPPED: POST_RESET_LOCKOUT" }, { status: 200 });
        }
      }
    }

    const adminClient = createAdminClient();
    const now = new Date();

    // Step 0: Apply any due scheduled_attendance (target_date <= today WIB)
    const { data: appliedCount, error: scheduleError } = await adminClient.rpc("cron_apply_scheduled_attendance");
    if (scheduleError) {
      console.error("Cron apply_scheduled failed:", scheduleError.message);
    } else if (typeof appliedCount === "number" && appliedCount > 0) {
      console.log(`Cron applied ${appliedCount} scheduled attendance entries.`);
    }

    // Step 1: Execute main cron state machine
    const { error: cronError } = await adminClient.rpc("execute_cron_state_machine", {
      p_now: now.toISOString(),
    });

    if (cronError) {
      console.error("Cron state machine failed:", cronError.message);
      return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, applied_schedules: appliedCount ?? 0 });
  } catch (error) {
    console.error("Cron execution failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    if (hasLock) {
      const currentLockVal = await redis.get<string>(lockKey);
      if (currentLockVal === lockValue) {
        await redis.del(lockKey);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
