import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { TrackerAutoRefresh } from "@/components/admin/tracker/tracker-auto-refresh";
import { TrackerClientShell } from "@/components/admin/tracker/tracker-client-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getTrackerData } from "@/lib/tracker/data";
import { getTrackerRoleTabs } from "@/lib/tracker/helpers";
import { canStaffTierPerformTrackerAction } from "@/lib/workers/tracker-actions";

export const metadata: Metadata = {
  title: "Tracker | KireiApp",
  description: "Read-only worker tracker overview.",
};

export default async function AdminTrackerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  const rawStatus = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;
  const initialStatus = rawStatus ? rawStatus.toUpperCase() : "";

  const data = await getTrackerData(staff);
  const roleTabs = getTrackerRoleTabs(data.cards);
  const canApplyTrackerActions = canStaffTierPerformTrackerAction(staff.profile.tier);

  return (
    <div className="flex flex-col gap-6">
      {/* Refresh data setiap 60 detik agar version worker tetap sinkron dengan DB */}
      <TrackerAutoRefresh />

      {data.issues.length > 0 ? <TrackerIssuePanel issues={data.issues} /> : null}

      <TrackerClientShell
        canApplyTrackerActions={canApplyTrackerActions}
        initialCards={data.cards}
        roleTabs={roleTabs}
        initialStatus={initialStatus}
      />
    </div>
  );
}

function TrackerIssuePanel({
  issues,
}: {
  issues: Array<{ message: string }>;
}) {
  return (
    <Alert>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Tracker Loaded With Notes</AlertTitle>
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
