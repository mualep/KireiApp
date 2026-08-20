import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, CalendarCheck } from "lucide-react";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { DailyTaskReviewClientShell } from "@/components/admin/daily-task/daily-task-review-client-shell";
import { DailyTaskMonthlyClientShell } from "@/components/admin/daily-task/daily-task-monthly-client-shell";
import { getDailyTaskMonthlyReport } from "@/lib/daily-task/monthly-data";

export const metadata: Metadata = {
  title: "Daily Task Review | KireiApp",
  description: "Review and approve daily task submissions from workers.",
};

type PageProps = {
  searchParams: Promise<{ date?: string; month?: string; view?: string }>;
};

export default async function DailyTaskReviewPage({ searchParams }: PageProps) {
  const staff = await getCurrentStaffUser();
  if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
    redirect("/admin/login");
  }

  const resolvedParams = await searchParams;
  const viewMode = resolvedParams.view || "daily";

  // 1. If Monthly Report Grid View
  if (viewMode === "monthly") {
    const monthlyData = await getDailyTaskMonthlyReport({
      monthParam: resolvedParams.month,
    });

    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-end gap-4 mb-6">
          <Link href="/admin/daily-task-config">
            <Button variant="default" className="h-9 px-4 font-bold flex items-center gap-2 text-xs">
              <Settings className="size-4" />
              Konfigurasi Task
            </Button>
          </Link>
        </div>

        <DailyTaskMonthlyClientShell
          data={monthlyData}
          isMemberMode={false}
          basePath="/admin/daily-task-review"
        />
      </div>
    );
  }

  // 2. Daily Review View (Default)
  const todayWIB = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const dateParam = resolvedParams.date || todayWIB;
  const supabase = await createClient();

  // Fetch all active members (tier = 'member' and is_deleted = false)
  const { data: members } = await supabase
    .from("users")
    .select("id, name")
    .eq("tier", "member")
    .eq("is_deleted", false);

  // Fetch worker profiles to map their shifts
  const { data: profiles } = await supabase
    .from("worker_profiles")
    .select("user_id, shift");

  const shiftMap = new Map((profiles || []).map((p) => [p.user_id, p.shift]));

  // Fetch daily task submissions for the selected date
  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("task_date", dateParam);

  // Fetch all users to map reviewer names
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name");

  const userMap = new Map((allUsers || []).map((u) => [u.id, u.name]));
  const tasksByUserId = new Map<string, typeof tasks>();
  for (const t of tasks || []) {
    const list = tasksByUserId.get(t.user_id) || [];
    list.push(t);
    tasksByUserId.set(t.user_id, list);
  }

  const mappedTasks = (members || []).flatMap((member) => {
    const userTasks = tasksByUserId.get(member.id);
    const shift = shiftMap.get(member.id) || "flexible";

    if (userTasks && userTasks.length > 0) {
      return userTasks.map((task) => ({
        ...task,
        worker_name: member.name,
        shift_label: task.shift_label || shift,
        reviewer_name: task.reviewed_by ? userMap.get(task.reviewed_by) || "System" : null,
      }));
    } else {
      return [
        {
          id: `placeholder-${member.id}`,
          user_id: member.id,
          worker_name: member.name,
          task_date: dateParam,
          shift_label: shift,
          stream_name: null,
          selected_games: [] as string[],
          checklist_snapshot: [] as Array<{
            id: string;
            game: string;
            phase: "before_work" | "while_work" | "after_work";
            sort_order: number;
            label: string;
          }>,
          checklist_answers: {} as Record<string, { checked: boolean; proof: string }>,
          status: "belum_mengisi" as const,
          reviewed_by: null,
          reviewer_name: null,
          reviewed_at: null,
          submitted_at: null,
          ss_before_time: null,
          ss_after_time: null,
          process_duration_minutes: null,
        },
      ];
    }
  });

  mappedTasks.sort((a, b) => a.worker_name.localeCompare(b.worker_name));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-end gap-4 mb-6">
        <Link href="/admin/daily-task-config">
          <Button variant="default" className="h-9 px-4 font-bold flex items-center gap-2 text-xs">
            <Settings className="size-4" />
            Konfigurasi Task
          </Button>
        </Link>
      </div>

      <DailyTaskReviewClientShell
        initialTasks={mappedTasks}
        selectedDate={dateParam}
      />
    </div>
  );
}
