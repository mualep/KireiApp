import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { RecordsSummaryCards } from "@/components/admin/records/records-summary-cards";
import { RecordsTable } from "@/components/admin/records/records-table";
import { RecordsToolbar } from "@/components/admin/records/records-toolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canAccessAdminRecords } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getRecordsData } from "@/lib/records/data";
import {
  filterRecordsRows,
  getRecordsRoleTabs,
  hasRecordsFilters,
  parseRecordsFilters,
  type RecordsSearchParams,
} from "@/lib/records/filters";

export const metadata: Metadata = {
  title: "Records | KireiApp",
  description: "Read-only monthly worker records.",
};

type AdminRecordsPageProps = {
  searchParams: Promise<RecordsSearchParams>;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

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

  const params = await searchParams;
  const monthParam = typeof params.month === "string" ? params.month : undefined;
  const filters = parseRecordsFilters(params);
  const hasFilters = hasRecordsFilters(filters);
  const data = await getRecordsData({ monthParam, staff });
  const filteredRows = filterRecordsRows(data.rows, filters);
  const roleTabs = getRecordsRoleTabs(data.rows);
  const scopeLabel = staff.profile.tier === "member" ? "Self-only" : null;
  const emptyTitle = hasFilters
    ? "No records match these filters."
    : "No records available.";
  const emptyDescription = hasFilters
    ? "Clear filters to return to the full readable Records view."
    : "Read-only monthly records appear after worker records are available.";

  return (
    <div className="flex flex-col gap-6">
      {data.issues.length > 0 ? <RecordsIssuePanel issues={data.issues} /> : null}

      <RecordsToolbar
        key={`${data.month.monthParam}:${filters.q}:${filters.role ?? ""}:${filters.sort}`}
        filters={filters}
        month={data.month}
        readableCount={numberFormatter.format(data.rows.length)}
        roleTabs={roleTabs}
        scopeLabel={scopeLabel}
        visibleCount={numberFormatter.format(filteredRows.length)}
      />

      <RecordsSummaryCards rows={filteredRows} />

      <RecordsTable
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        monthLabel={data.month.monthLabel}
        rows={filteredRows}
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
