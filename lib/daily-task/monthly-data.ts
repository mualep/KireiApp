import { createClient } from "@/lib/supabase/server";

export interface MonthlyTaskDTO {
  id: string;
  user_id: string;
  task_date: string;
  shift_label: string;
  stream_name: string | null;
  selected_games: string[];
  status: "draft" | "pending_review" | "approved" | "rejected";
  ss_before_time: string | null;
  ss_after_time: string | null;
  process_duration_minutes: number | null;
  buyer_name: string | null;
  task_description: string | null;
  problem_notes: string | null;
  ss_before_url: string | null;
  ss_after_url: string | null;
}

export interface MonthlyReportRowDTO {
  user_id: string;
  worker_name: string;
  shift: string;
  days: Record<number, MonthlyTaskDTO[]>;
  attendance: Record<number, string | null>;
}

export interface MonthlyReportData {
  monthParam: string; // "YYYY-MM"
  year: number;
  month: number;
  monthName: string;
  totalDaysInMonth: number;
  rows: MonthlyReportRowDTO[];
}

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function getDailyTaskMonthlyReport(options: {
  monthParam?: string; // YYYY-MM
  staffUserId?: string; // If restricted to a single member
}): Promise<MonthlyReportData> {
  const supabase = await createClient();

  // Current WIB date fallback if monthParam is invalid or omitted
  const todayWIB = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date()); // YYYY-MM-DD

  const currentYearMonth = todayWIB.slice(0, 7); // YYYY-MM
  const monthParam =
    options.monthParam && /^\d{4}-\d{2}$/.test(options.monthParam)
      ? options.monthParam
      : currentYearMonth;

  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const monthIdx = month - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || "";

  // Days in month calculation
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const monthStartStr = `${monthParam}-01`;
  const monthEndStr = `${monthParam}-${String(totalDaysInMonth).padStart(2, "0")}`;

  // 1. Fetch target users
  let userQuery = supabase
    .from("users")
    .select("id, name")
    .eq("tier", "member")
    .eq("is_deleted", false);

  if (options.staffUserId) {
    userQuery = userQuery.eq("id", options.staffUserId);
  }

  const { data: users } = await userQuery;

  // 2. Fetch worker profiles for shift info
  const userIds = (users || []).map((u) => u.id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("worker_profiles")
          .select("user_id, shift")
          .in("user_id", userIds)
      : { data: [] };

  const shiftMap = new Map((profiles || []).map((p) => [p.user_id, p.shift]));

  // 3. Fetch daily tasks for the month
  const { data: tasks } =
    userIds.length > 0
      ? await supabase
          .from("daily_tasks")
          .select("*")
          .in("user_id", userIds)
          .gte("task_date", monthStartStr)
          .lte("task_date", monthEndStr)
      : { data: [] };

  // 4. Fetch worker attendance for the month
  const { data: attendanceRows } =
    userIds.length > 0
      ? await supabase
          .from("worker_attendance")
          .select("user_id, attendance_date, status, is_canceled")
          .in("user_id", userIds)
          .gte("attendance_date", monthStartStr)
          .lte("attendance_date", monthEndStr)
          .eq("is_canceled", false)
      : { data: [] };

  // Group tasks by user_id -> dayNumber -> MonthlyTaskDTO[]
  const taskGroupMap = new Map<string, Map<number, MonthlyTaskDTO[]>>();
  (tasks || []).forEach((t) => {
    if (!t.task_date) return;
    const dayNum = Number(t.task_date.slice(8, 10));
    if (!taskGroupMap.has(t.user_id)) {
      taskGroupMap.set(t.user_id, new Map());
    }
    const dayMap = taskGroupMap.get(t.user_id)!;
    if (!dayMap.has(dayNum)) {
      dayMap.set(dayNum, []);
    }
    dayMap.get(dayNum)!.push(t as MonthlyTaskDTO);
  });

  // Group attendance by user_id -> dayNumber
  const attendanceGroupMap = new Map<string, Map<number, string>>();
  (attendanceRows || []).forEach((a: any) => {
    if (!a.attendance_date || !a.status) return;
    const dayNum = Number(a.attendance_date.slice(8, 10));
    if (!attendanceGroupMap.has(a.user_id)) {
      attendanceGroupMap.set(a.user_id, new Map());
    }
    attendanceGroupMap.get(a.user_id)!.set(dayNum, a.status);
  });

  // Build rows
  const rows: MonthlyReportRowDTO[] = (users || []).map((u) => {
    const userTaskMap = taskGroupMap.get(u.id);
    const userAttMap = attendanceGroupMap.get(u.id);

    const daysRecord: Record<number, MonthlyTaskDTO[]> = {};
    const attRecord: Record<number, string | null> = {};

    for (let day = 1; day <= totalDaysInMonth; day++) {
      daysRecord[day] = userTaskMap?.get(day) || [];
      attRecord[day] = userAttMap?.get(day) || null;
    }

    return {
      user_id: u.id,
      worker_name: u.name,
      shift: shiftMap.get(u.id) || "flexible",
      days: daysRecord,
      attendance: attRecord,
    };
  });

  // Sort rows by worker name
  rows.sort((a, b) => a.worker_name.localeCompare(b.worker_name));

  return {
    monthParam,
    year,
    month,
    monthName,
    totalDaysInMonth,
    rows,
  };
}
