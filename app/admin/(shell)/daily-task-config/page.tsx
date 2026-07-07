import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Eye } from "lucide-react";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { DailyTaskConfigManager } from "@/components/admin/daily-task/daily-task-config-manager";

export const metadata: Metadata = {
  title: "Konfigurasi Daily Task | KireiApp",
  description: "CMS Configuration Manager for Daily Tasks checklist.",
};

export default async function DailyTaskConfigPage() {
  const staff = await getCurrentStaffUser();
  if (!staff || (staff.profile.tier !== "owner" && staff.profile.tier !== "admin")) {
    redirect("/admin/login");
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <CalendarCheck className="size-8 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl" translate="no">
              Konfigurasi Daily Task
            </h1>
            <p className="text-muted-foreground text-sm">
              Kelola template checklist harian sebelum, selama, dan sesudah kerja.
            </p>
          </div>
        </div>
        <Link href="/admin/daily-task">
          <Button variant="outline" className="h-10 px-4 font-bold bg-background hover:bg-muted text-foreground border border-border flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            Preview Form Member
          </Button>
        </Link>
      </div>

      <DailyTaskConfigManager />
    </div>
  );
}
