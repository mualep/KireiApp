import { NextResponse, type NextRequest } from "next/server";
import { redis } from "@/lib/redis/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const WIB_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(isoDate: string, days: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate(d);
}

function makeWibDate(isoDate: string, hour: number, minute: number, dayOffset = 0): Date {
  const { year, month, day } = parseIsoDate(isoDate);
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour, minute) - WIB_OFFSET_MILLISECONDS);
}

function getShiftAlphaExpiry(shift: string, attendanceDate: string): Date {
  const { year, month, day } = parseIsoDate(attendanceDate);
  const expiryDate = new Date(Date.UTC(year, month - 1, day + 1));
  let expiryHour = 0;
  if (["A", "1", "B", "C", "2"].includes(shift)) {
    expiryHour = 0;
  } else if (["D", "E", "3", "F"].includes(shift)) {
    expiryHour = 12;
  } else {
    expiryHour = 0;
  }
  return makeWibDate(formatDate(expiryDate), expiryHour, 0);
}

async function writeAuditLog(
  adminClient: SupabaseClient,
  userId: string,
  action: string,
  payload: Record<string, unknown>
) {
  const { error } = await adminClient.rpc("write_audit_log", {
    p_domain: "cron",
    p_action: action,
    p_target_table: "worker_status",
    p_target_id: userId,
    p_payload: payload,
    p_target_user_id: userId,
  });
  if (error) {
    console.error(`Failed to write cron audit log for ${action}:`, error.message);
  }
}

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

    const adminClient = createAdminClient();

    interface WorkerProfileCache {
      user_id: string;
      shift: string;
      is_flexible: boolean;
      shift_start_hour: number | null;
      shift_start_min: number | null;
      shift_end_hour: number | null;
      shift_end_min: number | null;
    }

    // 1. Fetch static profiles from Redis cache or Supabase fallback
    const cachedProfilesStr = await redis.get<string>("cache:worker_profiles:active");
    let profiles: WorkerProfileCache[] = [];
    if (cachedProfilesStr) {
      try {
        profiles = typeof cachedProfilesStr === "string" ? JSON.parse(cachedProfilesStr) : cachedProfilesStr;
      } catch {
        profiles = [];
      }
    }

    if (!profiles || profiles.length === 0) {
      const { data: supabaseProfiles, error: profileFetchError } = await adminClient
        .from("worker_profiles")
        .select("user_id, shift, is_flexible, shift_start_hour, shift_start_min, shift_end_hour, shift_end_min")
        .eq("show_card", true);
      
      if (profileFetchError) {
        throw profileFetchError;
      }
      profiles = supabaseProfiles || [];
      await redis.set("cache:worker_profiles:active", JSON.stringify(profiles), { ex: 3600 });
    }

    const profilesMap = new Map(profiles.map((p) => [p.user_id, p]));

    // 2. Fetch worker_status dynamically
    const { data: statuses, error: statusFetchError } = await adminClient
      .from("worker_status")
      .select("user_id, current_status, version, alpha_done, shift_active_date, break_started_at, break_timer_running, break_accumulated_secs, break_late_recorded, sakit_started_at");

    if (statusFetchError) {
      throw statusFetchError;
    }

    const now = new Date();
    const wibTime = new Date(now.getTime() + WIB_OFFSET_MILLISECONDS);
    const wibDateStr = formatDate(wibTime);

    // 3. Process calculations and mutations in TypeScript
    for (const status of statuses || []) {
      const profile = profilesMap.get(status.user_id);
      if (!profile) continue;

      const {
        shift,
        is_flexible,
        shift_start_hour: startHour,
        shift_start_min: startMin,
        shift_end_hour: endHour,
        shift_end_min: endMin,
      } = profile;

      if (!is_flexible && startHour !== null && startMin !== null && endHour !== null && endMin !== null) {
        // Calculate shift bounds in WIB
        const shiftStartToday = makeWibDate(wibDateStr, startHour, startMin);
        
        let cycleDateStr = wibDateStr;
        if (now.getTime() < shiftStartToday.getTime()) {
          cycleDateStr = addDays(wibDateStr, -1);
        }

        let attendanceDateStr = cycleDateStr;
        if (startHour < 6) {
          attendanceDateStr = addDays(cycleDateStr, -1);
        }

        let cycleDateShiftStr = attendanceDateStr;
        let shiftEndDateStr = attendanceDateStr;
        if (startHour === 0) {
          cycleDateShiftStr = addDays(attendanceDateStr, 1);
          shiftEndDateStr = addDays(attendanceDateStr, 1);
        } else if (endHour < startHour || (endHour === 0 && startHour > 0)) {
          cycleDateShiftStr = attendanceDateStr;
          shiftEndDateStr = addDays(attendanceDateStr, 1);
        } else {
          cycleDateShiftStr = attendanceDateStr;
          shiftEndDateStr = attendanceDateStr;
        }

        const shiftStartsAt = makeWibDate(cycleDateShiftStr, startHour, startMin);
        const shiftEndsAt = makeWibDate(shiftEndDateStr, endHour, endMin);
        
        const { year, month } = parseIsoDate(attendanceDateStr);
        const periodMonthStr = `${year}-${String(month).padStart(2, "0")}-01`;

        // 1. ALPHA_DONE_RESET
        if (status.alpha_done && status.current_status === "off") {
          if (now.getTime() >= shiftStartsAt.getTime() && now.getTime() < shiftEndsAt.getTime()) {
            await adminClient
              .from("worker_status")
              .update({
                alpha_done: false,
                version: status.version + 1,
                updated_at: now.toISOString(),
              })
              .eq("user_id", status.user_id);

            await writeAuditLog(adminClient, status.user_id, "cron.alpha_done_reset", {
              message: "Reset alpha_done flag for new shift cycle",
            });
            continue;
          }
        }

        // 3. AUTO_ALPHA
        if (status.current_status === "off" && !status.alpha_done) {
          if (now.getTime() >= shiftEndsAt.getTime()) {
            // Check if attendance already exists
            const { data: existing } = await adminClient
              .from("worker_attendance")
              .select("id")
              .eq("user_id", status.user_id)
              .eq("attendance_date", attendanceDateStr)
              .maybeSingle();

            let attendanceInserted = false;
            if (!existing) {
              const { error: insertError } = await adminClient
                .from("worker_attendance")
                .insert({
                  user_id: status.user_id,
                  attendance_date: attendanceDateStr,
                  status: "alpha",
                  source: "cron",
                  source_action: "cron.auto_alpha",
                  created_at: now.toISOString(),
                  updated_at: now.toISOString(),
                });
              if (!insertError) {
                attendanceInserted = true;
              }
            }

            await adminClient
              .from("worker_status")
              .update({
                alpha_done: true,
                version: status.version + 1,
                updated_at: now.toISOString(),
              })
              .eq("user_id", status.user_id);

            if (attendanceInserted) {
              const { data: record } = await adminClient
                .from("worker_records")
                .select("alpha_count")
                .eq("user_id", status.user_id)
                .eq("period_month", periodMonthStr)
                .maybeSingle();

              if (record) {
                await adminClient
                  .from("worker_records")
                  .update({
                    alpha_count: record.alpha_count + 1,
                    last_source: "cron",
                    last_source_action: "cron.auto_alpha",
                    updated_at: now.toISOString(),
                  })
                  .eq("user_id", status.user_id)
                  .eq("period_month", periodMonthStr);
              } else {
                await adminClient
                  .from("worker_records")
                  .insert({
                    user_id: status.user_id,
                    period_month: periodMonthStr,
                    alpha_count: 1,
                    last_source: "cron",
                    last_source_action: "cron.auto_alpha",
                    created_at: now.toISOString(),
                    updated_at: now.toISOString(),
                  });
              }
            }

            await writeAuditLog(adminClient, status.user_id, "cron.auto_alpha", {
              attendance_date: attendanceDateStr,
              message: "Worker failed to clock in before shift end. Marked as ALPHA.",
            });
            continue;
          }
        }

        // 4. AUTO_OFF_SHIFT
        if (["on", "break"].includes(status.current_status)) {
          const actDateStr = status.shift_active_date || attendanceDateStr;
          let activeShiftEndDateStr = actDateStr;
          if (startHour === 0) {
            activeShiftEndDateStr = addDays(actDateStr, 1);
          } else if (endHour < startHour || (endHour === 0 && startHour > 0)) {
            activeShiftEndDateStr = addDays(actDateStr, 1);
          } else {
            activeShiftEndDateStr = actDateStr;
          }
          const actEndsAt = makeWibDate(activeShiftEndDateStr, endHour, endMin);

          if (now.getTime() >= actEndsAt.getTime()) {
            await adminClient
              .from("worker_status")
              .update({
                current_status: "off",
                version: status.version + 1,
                shift_active_date: null,
                shift_active_started_at: null,
                shift_active_label: null,
                shift_active_start_hour: null,
                shift_active_start_min: null,
                shift_active_end_hour: null,
                shift_active_end_min: null,
                break_started_at: null,
                break_timer_running: false,
                break_accumulated_secs: 0,
                break_late_recorded: false,
                sakit_started_at: null,
                pending_started_at: null,
                cuti_set_date: null,
                lembur_started_at: null,
                updated_at: now.toISOString(),
              })
              .eq("user_id", status.user_id);

            await writeAuditLog(adminClient, status.user_id, "cron.auto_off_shift", {
              message: "Shift ended. Automatically clocked off.",
            });
            continue;
          }
        }

        // 6. AUTO_ALPHA_EXPIRE
        if (status.alpha_done && status.current_status === "off") {
          const exp1 = getShiftAlphaExpiry(shift, attendanceDateStr);
          if (now.getTime() >= exp1.getTime()) {
            await adminClient
              .from("worker_status")
              .update({
                alpha_done: false,
                version: status.version + 1,
                updated_at: now.toISOString(),
              })
              .eq("user_id", status.user_id);

            await writeAuditLog(adminClient, status.user_id, "cron.auto_alpha_expire", {
              message: "ALPHA display expired.",
            });
            continue;
          }
        }
      }

      // 5. BREAK_LATE
      if (status.current_status === "break" && status.break_timer_running && status.break_started_at && !status.break_late_recorded) {
        const breakStartedAt = new Date(status.break_started_at);
        const totalBreakSecs = status.break_accumulated_secs + Math.floor((now.getTime() - breakStartedAt.getTime()) / 1000);
        if (totalBreakSecs > 3600) {
          const breakLateSeconds = totalBreakSecs - 3600;
          const actDateStr = status.shift_active_date || wibDateStr;
          const { year, month } = parseIsoDate(actDateStr);
          const actMonthStr = `${year}-${String(month).padStart(2, "0")}-01`;

          await adminClient
            .from("worker_status")
            .update({
              break_late_recorded: true,
              version: status.version + 1,
              updated_at: now.toISOString(),
            })
            .eq("user_id", status.user_id);

          const { data: record } = await adminClient
            .from("worker_records")
            .select("break_late_seconds")
            .eq("user_id", status.user_id)
            .eq("period_month", actMonthStr)
            .maybeSingle();

          if (record) {
            await adminClient
              .from("worker_records")
              .update({
                break_late_seconds: record.break_late_seconds + breakLateSeconds,
                last_source: "cron",
                last_source_action: "cron.break_late",
                updated_at: now.toISOString(),
              })
              .eq("user_id", status.user_id)
              .eq("period_month", actMonthStr);
          } else {
            await adminClient
              .from("worker_records")
              .insert({
                user_id: status.user_id,
                period_month: actMonthStr,
                break_late_seconds: breakLateSeconds,
                last_source: "cron",
                last_source_action: "cron.break_late",
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
              });
          }

          await writeAuditLog(adminClient, status.user_id, "cron.break_late", {
            break_late_seconds: breakLateSeconds,
            message: "Worker break duration exceeded 1 hour limit.",
          });
          continue;
        }
      }

      // 7. SAKIT_TO_PENDING
      if (status.current_status === "sakit" && status.sakit_started_at) {
        const sakitStartedAt = new Date(status.sakit_started_at);
        const limitTime = new Date(sakitStartedAt.getTime() + 72 * 60 * 60 * 1000);
        if (now.getTime() >= limitTime.getTime()) {
          await adminClient
            .from("worker_status")
            .update({
              current_status: "pending",
              pending_started_at: now.toISOString(),
              sakit_started_at: null,
              version: status.version + 1,
              updated_at: now.toISOString(),
            })
            .eq("user_id", status.user_id);

          await writeAuditLog(adminClient, status.user_id, "cron.sakit_to_pending", {
            message: "Sick leave exceeded 72 hours. Status transitioned to PENDING.",
          });
          continue;
        }
      }
    }

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
