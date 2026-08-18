import "server-only";

import { createClient } from "@/lib/supabase/server";
import { workerShiftDefinitions } from "@/lib/workers/constants";

const WIB_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;

export interface StatusCounts {
  alpha: number;
  break: number;
  break_late: number;
  cuti: number;
  late: number;
  lembur: number;
  off: number;
  on: number;
  pending: number;
  sakit: number;
  total_workers: number;
}

export interface MonthlySummary {
  alpha: { sum: number; workers: number };
  break_late_seconds: { sum: number; workers: number };
  lembur_units: { sum: number; workers: number };
  pending: { sum: number; workers: number };
  sakit: { sum: number; workers: number };
  work_late_seconds: { sum: number; workers: number };
}

export interface RecentActivity {
  action: string;
  actor_name: string | null;
  actor_tier: string | null;
  created_at: string;
  display_action: string;
  display_subject: string;
  domain: string;
  id: string;
  is_automated: boolean;
  payload: Record<string, unknown> | null;
  target_name: string | null;
}

export interface UrgentAlert {
  name: string;
  status: "LATE" | "ALPHA";
  user_id: string;
}

export interface HourlyActivityPoint {
  break: number;
  hour: string; // "00:00", "01:00", ..., "23:00"
  off: number;
  on: number;
}

export interface DashboardData {
  hourly_activity: HourlyActivityPoint[];
  monthly_summary: MonthlySummary;
  recent_activity: RecentActivity[];
  status_counts: StatusCounts;
  urgent_alerts: UrgentAlert[];
}

export async function getDashboardSummaryData(): Promise<DashboardData> {
  const now = new Date();
  const wibTime = new Date(now.getTime() + WIB_OFFSET_MILLISECONDS);
  const wibYear = wibTime.getUTCFullYear();
  const wibMonth = String(wibTime.getUTCMonth() + 1).padStart(2, "0");
  const wibDay = String(wibTime.getUTCDate()).padStart(2, "0");
  const wibDateStr = `${wibYear}-${wibMonth}-${wibDay}`;
  const periodMonthStr = `${wibYear}-${wibMonth}-01`;

  // Calculate current WIB hour (0-23)
  const currentWibHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    hour12: false,
  }).format(now);
  const currentWibHour = Number(currentWibHourStr);

  const supabase = await createClient();

  const [
    { data: allUsers },
    { data: profiles },
    { data: statuses },
    { data: records },
    { data: auditLogs },
    { data: snapshotRows },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, tier")
      .eq("is_deleted", false),
    supabase
      .from("worker_profiles")
      .select(
        "user_id, shift, is_flexible, shift_start_hour, shift_start_min, shift_end_hour, shift_end_min, temp_shift, temp_shift_until",
      ),
    supabase
      .from("worker_status")
      .select("user_id, current_status, alpha_done, break_started_at"),
    supabase.from("worker_records").select("*").eq("period_month", periodMonthStr),
    supabase
      .from("audit_logs")
      .select("id, actor_user_id, target_user_id, domain, action, payload_json, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("activity_snapshots")
      .select("snapshot_hour, status_counts")
      .eq("snapshot_date", wibDateStr),
  ]);

  const globalUserMap = new Map(
    (allUsers || []).map((u) => [u.id, { name: u.name, tier: u.tier }]),
  );

  const memberUsers = (allUsers || []).filter((u) => u.tier === "member");
  const activeUserMap = new Map(memberUsers.map((u) => [u.id, u.name]));

  const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  const statusMap = new Map((statuses || []).map((s) => [s.user_id, s]));

  const parseIsoDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split("-").map(Number);
    return { day, month, year };
  };

  const addDays = (isoDate: string, days: number): string => {
    const { day, month, year } = parseIsoDate(isoDate);
    const d = new Date(Date.UTC(year, month - 1, day + days));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dayStr}`;
  };

  const makeWibDate = (isoDate: string, hour: number, minute: number, dayOffset = 0): Date => {
    const { day, month, year } = parseIsoDate(isoDate);
    return new Date(
      Date.UTC(year, month - 1, day + dayOffset, hour, minute) - WIB_OFFSET_MILLISECONDS,
    );
  };

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

  const urgentAlerts: UrgentAlert[] = [];

  for (const [userId, name] of activeUserMap.entries()) {
    const profile = profilesMap.get(userId);
    const status = statusMap.get(userId);

    if (!status) continue;

    let isLate = false;

    const isTempActive =
      profile?.temp_shift &&
      profile?.temp_shift_until &&
      new Date(profile.temp_shift_until).getTime() > now.getTime();

    const tempDef = isTempActive
      ? workerShiftDefinitions[profile.temp_shift as keyof typeof workerShiftDefinitions]
      : null;

    const isFlexible = tempDef ? tempDef.isFlexible : profile?.is_flexible;
    const startHour = tempDef ? tempDef.startHour : profile?.shift_start_hour;
    const startMin = tempDef ? tempDef.startMinute : profile?.shift_start_min;
    const endHour = tempDef ? tempDef.endHour : profile?.shift_end_hour;
    const endMin = tempDef ? tempDef.endMinute : profile?.shift_end_min;

    if (
      profile &&
      !isFlexible &&
      startHour !== null &&
      startHour !== undefined &&
      startMin !== null &&
      startMin !== undefined &&
      endHour !== null &&
      endHour !== undefined &&
      endMin !== null &&
      endMin !== undefined
    ) {
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

      const isInShift =
        now.getTime() >= shiftStartsAt.getTime() && now.getTime() < shiftEndsAt.getTime();
      isLate =
        status.current_status === "off" &&
        !status.alpha_done &&
        isInShift &&
        now.getTime() - shiftStartsAt.getTime() >= 10 * 60 * 1000;
    }

    if (status.alpha_done) {
      alphaCount++;
      urgentAlerts.push({ name, status: "ALPHA", user_id: userId });
    } else if (isLate) {
      lateCount++;
      urgentAlerts.push({ name, status: "LATE", user_id: userId });
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
    alpha: alphaCount,
    break: breakCount,
    break_late: breakLateCount,
    cuti: cutiCount,
    late: lateCount,
    lembur: lemburCount,
    off: offCount,
    on: onCount,
    pending: pendingCount,
    sakit: sakitCount,
    total_workers: activeUserMap.size,
  };

  const getEffectiveValue = (base: number | null, delta: number | null) => {
    const baseVal = base || 0;
    const deltaVal = delta || 0;
    return Math.max(0, baseVal + deltaVal);
  };

  let workLateSum = 0;
  const workLateWorkers = new Set<string>();
  let breakLateSum = 0;
  const breakLateWorkers = new Set<string>();
  let lemburSum = 0;
  const lemburWorkers = new Set<string>();
  let alphaSum = 0;
  const alphaWorkers = new Set<string>();
  let sakitSum = 0;
  const sakitWorkers = new Set<string>();
  let pendingSum = 0;
  const pendingWorkers = new Set<string>();

  for (const record of records || []) {
    const workLate = getEffectiveValue(record.work_late_seconds, record.work_late_delta);
    const breakLate = getEffectiveValue(record.break_late_seconds, record.break_late_delta);
    const lembur = getEffectiveValue(record.lembur_units, record.lembur_delta);
    const alpha = getEffectiveValue(record.alpha_count, record.alpha_delta);
    const sakit = getEffectiveValue(record.sakit_days, record.sakit_delta);
    const pending = getEffectiveValue(record.pending_days, record.pending_delta);

    if (workLate > 0) {
      workLateSum += workLate;
      workLateWorkers.add(record.user_id);
    }
    if (breakLate > 0) {
      breakLateSum += breakLate;
      breakLateWorkers.add(record.user_id);
    }
    if (lembur > 0) {
      lemburSum += lembur;
      lemburWorkers.add(record.user_id);
    }
    if (alpha > 0) {
      alphaSum += alpha;
      alphaWorkers.add(record.user_id);
    }
    if (sakit > 0) {
      sakitSum += sakit;
      sakitWorkers.add(record.user_id);
    }
    if (pending > 0) {
      pendingSum += pending;
      pendingWorkers.add(record.user_id);
    }
  }

  const monthlySummary = {
    alpha: { sum: alphaSum, workers: alphaWorkers.size },
    break_late_seconds: { sum: breakLateSum, workers: breakLateWorkers.size },
    lembur_units: { sum: lemburSum, workers: lemburWorkers.size },
    pending: { sum: pendingSum, workers: pendingWorkers.size },
    sakit: { sum: sakitSum, workers: sakitWorkers.size },
    work_late_seconds: { sum: workLateSum, workers: workLateWorkers.size },
  };

  const formatWibTime = (isoString: string): string => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const timeStr = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
      return timeStr.replace(":", ".");
    } catch {
      return "";
    }
  };

  const formatBaseActionText = (domain: string, action: string) => {
    if (action === "cron.auto_alpha") return "ALPHA";
    if (action === "cron.auto_off_shift") return "Clock-Off (Shift Selesai)";
    if (action === "cron.alpha_done_reset") return "Reset Alpha";
    if (domain === "auth" && action === "login") return "Login ke sistem";
    if (domain === "auth" && action === "logout") return "Logout dari sistem";
    if (domain === "daily_task" && action === "create") return "Submit Daily Task";
    if (domain === "daily_task" && action === "update") return "Update Daily Task";
    if (domain === "profile" && action === "update") return "Memperbarui Profil";
    if (action === "tracker.start") return "Tracker: start";
    if (action === "tracker.stop") return "Tracker: stop";
    if (action === "tracker.break_start") return "Tracker: break start";
    if (action === "tracker.break_stop") return "Tracker: break stop";
    if (action === "absensi.create") return "Mencatat Kehadiran";
    if (action === "absensi.update") return "Mengubah Data Absensi";
    if (action === "absensi.delete") return "Menghapus Data Absensi";
    if (action === "records.override") return "Override Record";

    const cleaned = action.replace(/_/g, " ").replace(/\./g, ": ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const recentActivity: RecentActivity[] = (auditLogs || []).map((log) => {
    const actor = log.actor_user_id ? globalUserMap.get(log.actor_user_id) : null;
    const target = log.target_user_id ? globalUserMap.get(log.target_user_id) : null;

    const timeWib = formatWibTime(log.created_at);
    const baseAction = formatBaseActionText(log.domain, log.action);

    const isAutomated = !actor;
    let displaySubject = "System";
    let displayTier = "system";
    let displayAction = "";

    if (actor) {
      // Manual Action: Subject is Actor, Tier is Actor
      displaySubject = actor.name;
      displayTier = actor.tier;
      const targetNameUpper = target ? target.name.toUpperCase() : "";
      displayAction = targetNameUpper
        ? `${baseAction} ${targetNameUpper} ${timeWib}`.trim()
        : `${baseAction} ${timeWib}`.trim();
    } else if (target) {
      // Automated Action: Subject is Target, Tier is Target
      displaySubject = target.name;
      displayTier = target.tier;
      displayAction = `Otomatis ${baseAction} ${timeWib}`.trim();
    } else {
      // System fallback
      displaySubject = "System";
      displayTier = "system";
      displayAction = `Otomatis ${baseAction} ${timeWib}`.trim();
    }

    return {
      action: displayAction,
      actor_name: actor ? actor.name : null,
      actor_tier: displayTier,
      created_at: log.created_at,
      display_action: displayAction,
      display_subject: displaySubject,
      domain: log.domain,
      id: log.id,
      is_automated: isAutomated,
      payload: log.payload_json,
      target_name: target ? target.name : null,
    };
  });

  // Map 24-hour activity snapshots & STITCH LIVE CURRENT HOUR
  const snapshotMap = new Map(
    (snapshotRows || []).map((s) => [s.snapshot_hour, s.status_counts]),
  );

  const hourly_activity: HourlyActivityPoint[] = Array.from({ length: 24 }, (_, h) => {
    const hourLabel = `${String(h).padStart(2, "0")}:00`;
    const counts = (snapshotMap.get(h) as Record<string, number> | undefined) || {};

    let onVal = typeof counts.on === "number" ? counts.on : 0;
    let breakVal = typeof counts.break === "number" ? counts.break : 0;
    let offVal = typeof counts.off === "number" ? counts.off : 0;

    // Stitch LIVE counts into the current WIB hour slot
    if (h === currentWibHour) {
      onVal = onCount;
      breakVal = breakCount;
      offVal = offCount;
    }

    return {
      break: breakVal,
      hour: hourLabel,
      off: offVal,
      on: onVal,
    };
  });

  return {
    hourly_activity,
    monthly_summary: monthlySummary,
    recent_activity: recentActivity,
    status_counts: statusCounts,
    urgent_alerts: urgentAlerts,
  };
}
