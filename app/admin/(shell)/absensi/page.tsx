import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { AbsensiMonthGrid } from "@/components/admin/absensi/absensi-month-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canAccessAdminAbsensi } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getAbsensiData } from "@/lib/absensi/data";

export const metadata: Metadata = {
  title: "Absensi | KireiApp",
  description: "Read-only daily attendance grid.",
};

type AdminAbsensiPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAbsensiPage({
  searchParams,
}: AdminAbsensiPageProps) {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminAbsensi(staff.profile.tier)) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const monthParam = typeof params.month === "string" ? params.month : undefined;
  const data = await getAbsensiData({ monthParam, staff });
  const scopeLabel =
    staff.profile.tier === "member" ? "Self-only" : "All visible workers";

  return (
    <div className="flex flex-col gap-2.5">
      {data.issues.length > 0 ? <AbsensiIssuePanel issues={data.issues} /> : null}

      <Card className="tracker-glass-panel rounded-xl border">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Selected Month
            </p>
            <p className="mt-1 truncate text-sm font-black">
              {data.month.monthLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="h-6 border-border bg-background/40 px-2 text-[0.65rem] text-muted-foreground"
            >
              {scopeLabel}
            </Badge>
            <Badge
              variant="outline"
              className="h-6 border-border bg-background/30 px-2 text-[0.65rem] text-muted-foreground"
            >
              Read-only
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/absensi?month=${data.month.previousMonthParam}`}>
                Previous
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/absensi?month=${data.month.nextMonthParam}`}>
                Next
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AbsensiMonthGrid month={data.month} rows={data.rows} />
    </div>
  );
}

function AbsensiIssuePanel({
  issues,
}: {
  issues: Array<{ message: string }>;
}) {
  return (
    <Alert>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Absensi Loaded With Notes</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {issues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
