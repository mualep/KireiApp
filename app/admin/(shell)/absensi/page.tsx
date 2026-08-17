import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { AbsensiClientShell } from "@/components/admin/absensi/absensi-client-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canAccessAdminAbsensi } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getAbsensiData } from "@/lib/absensi/data";
import { getAbsensiRoleTabs, type AbsensiSearchParams } from "@/lib/absensi/filters";
import { getCurrentWibDateParam } from "@/lib/absensi/helpers";

export const metadata: Metadata = {
  title: "Absensi | KireiApp",
  description: "Read-only daily attendance grid.",
};

type AdminAbsensiPageProps = {
  searchParams: Promise<AbsensiSearchParams>;
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
  const roleTabs = getAbsensiRoleTabs(data.rows);
  const canCorrectAbsensi = staff.profile.tier !== "member";
  const currentWibDate = getCurrentWibDateParam();
  const scopeLabel = staff.profile.tier === "member" ? "Self-only" : null;

  return (
    <div className="flex flex-col gap-6">
      {data.issues.length > 0 ? <AbsensiIssuePanel issues={data.issues} /> : null}

      <AbsensiClientShell
        canCorrect={canCorrectAbsensi}
        currentWibDate={currentWibDate}
        initialRows={data.rows}
        month={data.month}
        roleTabs={roleTabs}
        scopeLabel={scopeLabel}
      />
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
