import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, CalendarCheck } from "lucide-react";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { DailyTaskReviewTable } from "@/components/admin/daily-task/daily-task-review-table";

export const metadata: Metadata = {
  title: "Daily Task Review | KireiApp",
  description: "Review and approve daily task submissions from workers.",
};

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function DailyTaskReviewPage({ searchParams }: PageProps) {
  const staff = await getCurrentStaffUser();
  if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
    redirect("/admin/login");
  }

  // 1. Calculate today's date in Asia/Jakarta (WIB) timezone
  const todayWIB = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const resolvedParams = await searchParams;
  const dateParam = resolvedParams.date || todayWIB;

  const supabase = await createClient();

  // 2. Fetch all active members (tier = 'member' and is_deleted = false)
  const { data: members } = await supabase
    .from("users")
    .select("id, name")
    .eq("tier", "member")
    .eq("is_deleted", false);

  // 3. Fetch worker profiles to map their shifts
  const { data: profiles } = await supabase
    .from("worker_profiles")
    .select("user_id, shift");

  const shiftMap = new Map((profiles || []).map((p) => [p.user_id, p.shift]));

  // 4. Fetch daily task submissions for the selected date
  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("task_date", dateParam);

  // 5. Fetch all users to map reviewer names
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name");

  const userMap = new Map((allUsers || []).map((u) => [u.id, u.name]));
  const taskMap = new Map((tasks || []).map((t) => [t.user_id, t]));

  const mappedTasks = (members || []).map((member) => {
    const task = taskMap.get(member.id);
    const shift = shiftMap.get(member.id) || "flexible";

    if (task) {
      return {
        ...task,
        worker_name: member.name,
        shift_label: task.shift_label || shift,
        reviewer_name: task.reviewed_by ? userMap.get(task.reviewed_by) || "System" : null,
      };
    } else {
      // Placeholder task object for workers who haven't submitted yet
      return {
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
      };
    }
  });

  // Sort alphabetically by worker name by default
  mappedTasks.sort((a, b) => a.worker_name.localeCompare(b.worker_name));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <CalendarCheck className="size-8 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl" translate="no">
              Daily Task Review
            </h1>
            <p className="text-muted-foreground text-sm">
              Periksa dan setujui laporan tugas harian dari pemain.
            </p>
          </div>
        </div>
        <Link href="/admin/daily-task-config">
          <Button variant="outline" className="h-10 px-4 font-bold bg-background hover:bg-muted text-foreground border border-border flex items-center gap-2">
            <Settings className="size-4 text-muted-foreground" />
            Konfigurasi Task
          </Button>
        </Link>
      </div>

      <DailyTaskReviewTable
        initialTasks={mappedTasks}
        selectedDate={dateParam}
      />
    </div>
  );
}
