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

    // Step 0.5: AUTO_CARRYOVER — Carry over cuti/sakit/pending workers in POST-SHIFT to tomorrow
    const carryoverCount = await processAutoCarryover(adminClient, now);
    if (carryoverCount > 0) {
      console.log(`Cron auto-carried over ${carryoverCount} workers to tomorrow.`);
    }

    // Step 1: Execute main cron state machine
    const { error: cronError } = await adminClient.rpc("execute_cron_state_machine", {
      p_now: now.toISOString(),
    });

    if (cronError) {
      console.error("Cron state machine failed:", cronError.message);
      return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      applied_schedules: appliedCount ?? 0,
      carried_over: carryoverCount,
    });
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

async function processAutoCarryover(
  adminClient: ReturnType<typeof createAdminClient>,
  now: Date
): Promise<number> {
  let carryoverCount = 0;
  const WIB_OFFSET = 7 * 60 * 60 * 1000;

  const wibDate = new Date(now.getTime() + WIB_OFFSET);
  const wibYear = wibDate.getUTCFullYear();
  const wibMonth = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const wibDay = String(wibDate.getUTCDate()).padStart(2, "0");
  const todayWibStr = `${wibYear}-${wibMonth}-${wibDay}`;

  const tomorrowWibDate = new Date(wibDate.getTime() + 24 * 60 * 60 * 1000);
  const tomYear = tomorrowWibDate.getUTCFullYear();
  const tomMonth = String(tomorrowWibDate.getUTCMonth() + 1).padStart(2, "0");
  const tomDay = String(tomorrowWibDate.getUTCDate()).padStart(2, "0");
  const tomorrowWibStr = `${tomYear}-${tomMonth}-${tomDay}`;

  // Fetch system admin user ID for scheduled_by
  const { data: adminUser } = await adminClient
    .from("users")
    .select("id")
    .in("tier", ["owner", "admin"])
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  const systemAdminId = adminUser?.id;

  // Fetch workers with current_status IN ('cuti', 'sakit', 'pending')
  const { data: activeWorkers, error } = await adminClient
    .from("worker_status")
    .select(`
      user_id,
      current_status,
      sakit_started_at,
      worker_profiles!inner (
        shift,
        is_flexible,
        shift_start_hour,
        shift_start_min,
        shift_end_hour,
        shift_end_min,
        cuti_stock,
        show_card
      )
    `)
    .in("current_status", ["cuti", "sakit", "pending"]);

  if (error || !activeWorkers) {
    return 0;
  }

  const parseIsoDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    return { day: d, month: m, year: y };
  };

  const addDays = (isoDate: string, days: number): string => {
    const { day, month, year } = parseIsoDate(isoDate);
    const d = new Date(Date.UTC(year, month - 1, day + days));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dayStr}`;
  };

  const makeWibDate = (isoDate: string, h: number, min: number, dayOffset = 0): Date => {
    const { day, month, year } = parseIsoDate(isoDate);
    return new Date(Date.UTC(year, month - 1, day + dayOffset, h, min) - WIB_OFFSET);
  };

  for (const workerRow of activeWorkers) {
    try {
      const profile = Array.isArray(workerRow.worker_profiles)
        ? workerRow.worker_profiles[0]
        : workerRow.worker_profiles;

      if (!profile || !profile.show_card) continue;

      let isPostShift = false;

      if (profile.is_flexible) {
        // Flexible shift: POST-SHIFT is after 23:55 WIB
        const wibHour = wibDate.getUTCHours();
        isPostShift = wibHour === 23 && wibDate.getUTCMinutes() >= 55;
      } else if (
        profile.shift_start_hour !== null &&
        profile.shift_start_min !== null &&
        profile.shift_end_hour !== null &&
        profile.shift_end_min !== null
      ) {
        const startHour = profile.shift_start_hour;
        const startMin = profile.shift_start_min;
        const endHour = profile.shift_end_hour;
        const endMin = profile.shift_end_min;

        const shiftStartToday = makeWibDate(todayWibStr, startHour, startMin);
        let cycleDateStr = todayWibStr;
        if (now.getTime() < shiftStartToday.getTime()) {
          cycleDateStr = addDays(todayWibStr, -1);
        }

        let attendanceDateStr = cycleDateStr;
        if (startHour < 6) {
          attendanceDateStr = addDays(cycleDateStr, -1);
        }

        let shiftEndDateStr = attendanceDateStr;
        if (startHour === 0) {
          shiftEndDateStr = addDays(attendanceDateStr, 1);
        } else if (endHour < startHour || (endHour === 0 && startHour > 0)) {
          shiftEndDateStr = addDays(attendanceDateStr, 1);
        } else {
          shiftEndDateStr = attendanceDateStr;
        }

        const shiftEndsAt = makeWibDate(shiftEndDateStr, endHour, endMin);
        isPostShift = now.getTime() >= shiftEndsAt.getTime();
      }

      if (!isPostShift) continue;

      // Double-apply guard for tomorrow
      const [{ data: existingAttendance }, { data: existingSchedule }] = await Promise.all([
        adminClient
          .from("worker_attendance")
          .select("id")
          .eq("user_id", workerRow.user_id)
          .eq("attendance_date", tomorrowWibStr)
          .eq("is_canceled", false)
          .maybeSingle(),
        adminClient
          .from("scheduled_attendance")
          .select("id")
          .eq("user_id", workerRow.user_id)
          .eq("target_date", tomorrowWibStr)
          .is("applied_at", null)
          .is("cancelled_at", null)
          .maybeSingle(),
      ]);

      if (existingAttendance || existingSchedule) {
        continue; // Skip if tomorrow's attendance or schedule already exists
      }

      // Determine next status
      let nextStatus = workerRow.current_status;

      if (workerRow.current_status === "sakit") {
        if (workerRow.sakit_started_at) {
          const sakitStart = new Date(workerRow.sakit_started_at).getTime();
          const durationHours = (now.getTime() - sakitStart) / (1000 * 60 * 60);
          if (durationHours >= 72) {
            nextStatus = "pending";
          }
        }
      } else if (workerRow.current_status === "cuti") {
        const currentCutiStock = profile.cuti_stock ?? 0;
        if (currentCutiStock > 0) {
          nextStatus = "cuti";
        } else {
          nextStatus = "alpha";
        }
      }

      const schedulerId = systemAdminId || workerRow.user_id;

      // Create scheduled_attendance for tomorrow
      const { error: insertError } = await adminClient
        .from("scheduled_attendance")
        .insert({
          user_id: workerRow.user_id,
          target_date: tomorrowWibStr,
          status: nextStatus,
          scheduled_by: schedulerId,
          notes: `Auto-carryover (${workerRow.current_status.toUpperCase()} -> ${nextStatus.toUpperCase()})`,
        });

      if (insertError) {
        console.error(`Auto-carryover insert failed for ${workerRow.user_id}:`, insertError.message);
        continue;
      }

      // If next status is cuti, decrement cuti_stock
      if (nextStatus === "cuti") {
        await adminClient
          .from("worker_profiles")
          .update({
            cuti_stock: Math.max(0, (profile.cuti_stock ?? 0) - 1),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", workerRow.user_id);
      }

      // Audit Log
      await adminClient.from("audit_logs").insert({
        actor_user_id: null,
        target_user_id: workerRow.user_id,
        domain: "cron",
        action: "cron.auto_carryover",
        payload_json: {
          from_status: workerRow.current_status,
          next_status: nextStatus,
          target_date: tomorrowWibStr,
        },
      });

      carryoverCount++;
    } catch (err) {
      console.error(`Auto-carryover error for worker ${workerRow.user_id}:`, err);
    }
  }

  return carryoverCount;
}
