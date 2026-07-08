import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

const WIB_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;

export async function GET() {
  try {
    const staff = await getCurrentStaffUser();
    if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch data in parallel for high performance
    const [
      { data: users },
      { data: profiles },
      { data: statuses },
      { data: records },
      { data: auditLogs }
    ] = await Promise.all([
      supabase.from("users").select("id, name").eq("is_deleted", false).eq("tier", "member"),
      supabase.from("worker_profiles").select("user_id, shift, is_flexible, shift_start_hour, shift_start_min, shift_end_hour, shift_end_min"),
      supabase.from("worker_status").select("user_id, current_status, alpha_done, break_started_at"),
      supabase.from("worker_records").select("*"),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20)
    ]);

    const activeUserMap = new Map((users || []).map((u) => [u.id, u.name]));
    const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const statusMap = new Map((statuses || []).map((s) => [s.user_id, s]));

    // Determine today's date context in Asia/Jakarta (WIB)
    const now = new Date();
    const wibTime = new Date(now.getTime() + WIB_OFFSET_MILLISECONDS);
    const wibYear = wibTime.getUTCFullYear();
    const wibMonth = String(wibTime.getUTCMonth() + 1).padStart(2, "0");
    const wibDay = String(wibTime.getUTCDate()).padStart(2, "0");
    const wibDateStr = `${wibYear}-${wibMonth}-${wibDay}`;
    const periodMonthStr = `${wibYear}-${wibMonth}-01`;

    const parseIsoDate = (isoDate: string) => {
      const [year, month, day] = isoDate.split("-").map(Number);
      return { year, month, day };
    };

    const addDays = (isoDate: string, days: number): string => {
      const { year, month, day } = parseIsoDate(isoDate);
      const d = new Date(Date.UTC(year, month - 1, day + days));
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${dayStr}`;
    };

    const makeWibDate = (isoDate: string, hour: number, minute: number, dayOffset = 0): Date => {
      const { year, month, day } = parseIsoDate(isoDate);
      return new Date(Date.UTC(year, month - 1, day + dayOffset, hour, minute) - WIB_OFFSET_MILLISECONDS);
    };

    // 2. Aggregate active members status counts and identify urgent alerts
    let onCount = 0;
    let offCount = 0;
    let breakCount = 0;
    let breakLateCount = 0;
    let cutiCount = 0;
    let sakitCount = 0;
    let pendingCount = 0;
    let lemburCount = 0;
    let lateCount = 0;
    let alphaCount = 0;

    const urgentAlerts: Array<{ user_id: string; name: string; status: "LATE" | "ALPHA" }> = [];

    for (const [userId, name] of activeUserMap.entries()) {
      const profile = profilesMap.get(userId);
      const status = statusMap.get(userId);

      if (!status) continue;

      let isLate = false;

      if (profile && !profile.is_flexible && profile.shift_start_hour !== null && profile.shift_start_min !== null && profile.shift_end_hour !== null && profile.shift_end_min !== null) {
        const startHour = profile.shift_start_hour;
        const startMin = profile.shift_start_min;
        const endHour = profile.shift_end_hour;
        const endMin = profile.shift_end_min;

        // Calculate shift bounds in WIB timezone
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

        const isInShift = now.getTime() >= shiftStartsAt.getTime() && now.getTime() < shiftEndsAt.getTime();
        isLate = status.current_status === "off" && 
                 !status.alpha_done && 
                 isInShift && 
                 (now.getTime() - shiftStartsAt.getTime() >= 10 * 60 * 1000);
      }

      if (status.alpha_done) {
        alphaCount++;
        urgentAlerts.push({ user_id: userId, name, status: "ALPHA" });
      } else if (isLate) {
        lateCount++;
        urgentAlerts.push({ user_id: userId, name, status: "LATE" });
      } else if (status.current_status === "break") {
        let isBreakLate = false;
        if (status.break_started_at) {
          const breakStart = new Date(status.break_started_at).getTime();
          if (now.getTime() - breakStart > 60 * 60 * 1000) {
            isBreakLate = true;
          }
        }
        if (isBreakLate) {
          breakLateCount++;
        } else {
          breakCount++;
        }
      } else if (status.current_status === "cuti") {
        cutiCount++;
      } else if (status.current_status === "sakit") {
        sakitCount++;
      } else if (status.current_status === "pending") {
        pendingCount++;
      } else if (status.current_status === "lembur") {
        lemburCount++;
      } else if (status.current_status === "on") {
        onCount++;
      } else {
        offCount++;
      }
    }

    const statusCounts = {
      total_workers: activeUserMap.size,
      on: onCount,
      off: offCount,
      break: breakCount,
      break_late: breakLateCount,
      cuti: cutiCount,
      sakit: sakitCount,
      pending: pendingCount,
      lembur: lemburCount,
      late: lateCount,
      alpha: alphaCount,
    };

    // 3. Compute Monthly Aggregation metrics (with V2 base + delta calculation)
    const getEffectiveValue = (base: number | null, delta: number | null) => {
      const baseVal = base || 0;
      const deltaVal = delta || 0;
      return Math.max(0, baseVal + deltaVal);
    };

    let totalWorkLateSeconds = 0;
    let totalBreakLateSeconds = 0;
    let totalAlphaCount = 0;
    let totalSakitDays = 0;
    let totalPendingDays = 0;
    let totalLemburUnits = 0;

    const monthlyRecords = (records || []).filter((r) => r.period_month === periodMonthStr);

    for (const record of monthlyRecords) {
      totalWorkLateSeconds += getEffectiveValue(record.work_late_seconds, record.work_late_delta);
      totalBreakLateSeconds += getEffectiveValue(record.break_late_seconds, record.break_late_delta);
      totalAlphaCount += getEffectiveValue(record.alpha_count, record.alpha_delta);
      totalSakitDays += getEffectiveValue(record.sakit_days, record.sakit_delta);
      totalPendingDays += getEffectiveValue(record.pending_days, record.pending_delta);
      totalLemburUnits += getEffectiveValue(record.lembur_units, record.lembur_delta);
    }

    const monthlySummary = {
      work_late_seconds: totalWorkLateSeconds,
      break_late_seconds: totalBreakLateSeconds,
      alpha_count: totalAlphaCount,
      sakit_days: totalSakitDays,
      pending_days: totalPendingDays,
      lembur_units: totalLemburUnits,
    };

    // 4. Map recent audit logs with username lookup
    const allUsersWithStaff = await supabase.from("users").select("id, name, tier");
    const globalUserMap = new Map(
      (allUsersWithStaff.data || []).map((u) => [u.id, { name: u.name, tier: u.tier }])
    );

    const recentActivity = (auditLogs || []).map((log) => {
      const actor = log.actor_user_id ? globalUserMap.get(log.actor_user_id) : null;
      const target = log.target_user_id ? globalUserMap.get(log.target_user_id) : null;
      return {
        id: log.id,
        actor_name: actor ? actor.name : "System",
        actor_tier: actor ? actor.tier : "system",
        target_name: target ? target.name : null,
        domain: log.domain,
        action: log.action,
        payload: log.payload_json,
        created_at: log.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        status_counts: statusCounts,
        monthly_summary: monthlySummary,
        recent_activity: recentActivity,
        urgent_alerts: urgentAlerts,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
