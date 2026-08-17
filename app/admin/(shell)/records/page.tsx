import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { RecordsClientShell } from "@/components/admin/records/records-client-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canAccessAdminRecords } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getRecordsData } from "@/lib/records/data";
import { getRecordsRoleTabs, type RecordsSearchParams } from "@/lib/records/filters";

export const metadata: Metadata = {
  title: "Records | KireiApp",
  description: "Read-only monthly worker records.",
};

type AdminRecordsPageProps = {
  searchParams: Promise<RecordsSearchParams>;
};

export default async function AdminRecordsPage({
  searchParams,
}: AdminRecordsPageProps) {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  if (!canAccessAdminRecords(staff.profile.tier)) {
    redirect("/admin/login");
  }

  const canCorrectRecords = staff.profile.tier !== "member";
  const params = await searchParams;
  const monthParam = typeof params.month === "string" ? params.month : undefined;
  const data = await getRecordsData({ monthParam, staff });
  const roleTabs = getRecordsRoleTabs(data.rows);
  const scopeLabel = staff.profile.tier === "member" ? "Self-only" : null;

  return (
    <div className="flex flex-col gap-6">
      {data.issues.length > 0 ? <RecordsIssuePanel issues={data.issues} /> : null}

      <RecordsClientShell
        canCorrectRecords={canCorrectRecords}
        initialRows={data.rows}
        isOwner={staff.profile.tier === "owner"}
        month={data.month}
        roleTabs={roleTabs}
        scopeLabel={scopeLabel}
      />
    </div>
  );
}

function RecordsIssuePanel({
  issues,
}: {
  issues: Array<{ message: string }>;
}) {
  return (
    <Alert>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Records Loaded With Notes</AlertTitle>
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
