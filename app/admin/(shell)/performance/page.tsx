import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CalendarCheckIcon,
  ClipboardListIcon,
  MousePointerClickIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { canAccessAdminPerformance, getStaffRedirectPath } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Performance | KireiApp",
  description: "read-only member performance shell.",
};

const shellCards = [
  {
    description: "Current Tracker status and shift context will appear here.",
    icon: MousePointerClickIcon,
    title: "Today",
  },
  {
    description: "Self-only Absensi attendance view will connect here.",
    icon: CalendarCheckIcon,
    title: "Attendance",
  },
  {
    description: "Monthly Records metrics will summarize here.",
    icon: ClipboardListIcon,
    title: "Monthly Records",
  },
  {
    description: "Available leave stock will stay visible here.",
    icon: ShieldCheckIcon,
    title: "Cuti",
  },
] as const;

export default async function AdminPerformancePage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminPerformance(staff.profile.tier)) {
    redirect(getStaffRedirectPath(staff.profile.tier));
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="tracker-glass-panel rounded-xl border p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="h-6 w-fit border-status-cuti/35 bg-status-cuti/10 text-status-cuti"
            >
              Read-only
            </Badge>
            <h1 className="mt-3 font-heading text-3xl font-black tracking-tight">
              Performance
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This member-only shell will summarize your self-only Tracker,
              Absensi, and Records data in one operational view.
            </p>
          </div>
          <Badge
            variant="outline"
            className="h-7 border-border bg-background/35 px-2.5 text-xs text-muted-foreground"
          >
            Self-only
          </Badge>
        </div>
      </section>

      <section
        aria-label="Read-only performance preview"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        {shellCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.title}
              size="sm"
              className="tracker-glass-panel rounded-xl border"
            >
              <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div>
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="mt-1 text-base">
                    Read-only preview
                  </CardTitle>
                </div>
                <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-background/45 text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
