import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  // 2. Fetch submissions for the selected date
  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("task_date", dateParam)
    .order("submitted_at", { ascending: false });

  // 3. Fetch active users to map names in-memory (safe and robust)
  const { data: users } = await supabase
    .from("users")
    .select("id, name");

  const userMap = new Map((users || []).map((u) => [u.id, u.name]));
  const mappedTasks = (tasks || []).map((task) => ({
    ...task,
    worker_name: userMap.get(task.user_id) || "Unknown",
    reviewer_name: task.reviewed_by ? userMap.get(task.reviewed_by) || "System" : null,
  }));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl" translate="no">
          Daily Task Review
        </h1>
        <p className="text-muted-foreground text-sm">
          Periksa dan setujui laporan tugas harian dari pemain.
        </p>
      </div>

      <DailyTaskReviewTable
        initialTasks={mappedTasks}
        selectedDate={dateParam}
      />
    </div>
  );
}
