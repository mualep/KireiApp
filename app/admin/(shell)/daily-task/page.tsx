import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { DailyTaskForm } from "@/components/admin/daily-task/daily-task-form";
import { DailyTaskMonthlyClientShell } from "@/components/admin/daily-task/daily-task-monthly-client-shell";
import { getDailyTaskMonthlyReport } from "@/lib/daily-task/monthly-data";
import { CalendarCheck, ListTodo, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daily Checklist Player | KireiApp",
  description: "Kirim dan tinjau checklist pemain harian dan status tugas.",
};

type PageProps = {
  searchParams: Promise<{ month?: string; view?: string }>;
};

export default async function DailyTaskPage({ searchParams }: PageProps) {
  const staff = await getCurrentStaffUser();
  if (!staff) {
    redirect("/admin/login");
  }

  const resolvedParams = await searchParams;
  const viewMode = resolvedParams.view || "daily";

  // 1. If Monthly Report Grid View for Member
  if (viewMode === "monthly") {
    const monthlyData = await getDailyTaskMonthlyReport({
      monthParam: resolvedParams.month,
      staffUserId: staff.profile.id,
    });

    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <CalendarCheck className="size-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl" translate="no">
                Daily Checklist Player
              </h1>
              <p className="text-muted-foreground text-sm">
                Rekapitulasi bulanan laporan tugas harian Anda.
              </p>
            </div>
          </div>
        </div>

        <DailyTaskMonthlyClientShell
          data={monthlyData}
          isMemberMode={true}
          basePath="/admin/daily-task"
        />
      </div>
    );
  }

  // 2. Daily Form View (Default)
  const supabase = await createClient();

  // Fetch active daily task configs
  const { data: configs } = await supabase
    .from("daily_task_config")
    .select("id, game, phase, sort_order, label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Fetch worker status to pre-populate shift
  const { data: workerStatus } = await supabase
    .from("worker_status")
    .select("shift_active_label, current_status, shift_active_started_at")
    .eq("user_id", staff.profile.id)
    .maybeSingle();

  // Ensure game choices are distinct and valid for selection
  const games = Array.from(
    new Set(
      (configs || [])
        .filter((c) => c.phase === "while_work" && c.game !== "_before_work" && c.game !== "_after_work")
        .map((c) => c.game)
    )
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Visual Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <CalendarCheck className="size-8 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl" translate="no">
              Daily Checklist Player
            </h1>
            <p className="text-muted-foreground text-sm">
              Lengkapi tugas harian Anda sebelum, selama, dan sesudah jam kerja.
            </p>
          </div>
        </div>

        {/* Member View Switcher Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50 shrink-0">
          <Link
            href="/admin/daily-task?view=daily"
            className="h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <ListTodo className="size-3.5" />
            Formulir Hari Ini
          </Link>
          <Link
            href="/admin/daily-task?view=monthly"
            className="h-8 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <FileSpreadsheet className="size-3.5" />
            Laporan Bulanan
          </Link>
        </div>
      </div>

      <DailyTaskForm
        staff={staff}
        initialWorkerStatus={workerStatus}
        configs={configs || []}
        games={games}
      />
    </div>
  );
}
