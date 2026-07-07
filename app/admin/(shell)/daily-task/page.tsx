import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { DailyTaskForm } from "@/components/admin/daily-task/daily-task-form";
import { CalendarCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Daily Checklist Player | KireiApp",
  description: "Submit and review daily player checklist and task status.",
};

export default async function DailyTaskPage() {
  const staff = await getCurrentStaffUser();
  if (!staff) {
    redirect("/admin/login");
  }

  const supabase = await createClient();

  // 1. Fetch active daily task configs
  const { data: configs } = await supabase
    .from("daily_task_config")
    .select("id, game, phase, sort_order, label")
    .eq("is_active", true);

  // 2. Fetch worker status to pre-populate shift
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
      {/* Visual Header shell */}
      <div className="flex items-center gap-3 mb-8">
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

      <DailyTaskForm
        staff={staff}
        initialWorkerStatus={workerStatus}
        configs={configs || []}
        games={games}
      />
    </div>
  );
}
