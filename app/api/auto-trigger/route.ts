import { NextResponse, type NextRequest } from "next/server";
import { redis } from "@/lib/redis/client";

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
    const acquired = await redis.set(lockKey, lockValue, { nx: true, px: 30000 });
    if (!acquired) {
      console.log("Cron overlap");
      return NextResponse.json({ message: "Cron overlap" }, { status: 200 });
    }
    hasLock = true;

    // Check system_reset_at lockout
    const systemResetAtStr = await redis.get<string>("system_reset_at");
    if (systemResetAtStr) {
      const systemResetAt = new Date(systemResetAtStr).getTime();
      if (!isNaN(systemResetAt)) {
        const timeSinceReset = Date.now() - systemResetAt;
        const lockoutPeriod = 6 * 60 * 1000; // 6 minutes

        if (timeSinceReset < lockoutPeriod) {
          console.log("CRON SKIPPED: POST_RESET_LOCKOUT");
          return NextResponse.json({ message: "CRON SKIPPED: POST_RESET_LOCKOUT" }, { status: 200 });
        }
      }
    }

    // TODO: State-machine rules and DB processing stub
    console.log("Cron execution: DB processing stub");

    return NextResponse.json({ ok: true });
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
