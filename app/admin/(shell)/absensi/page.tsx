import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { AbsensiMonthGrid } from "@/components/admin/absensi/absensi-month-grid";
import { AbsensiToolbar } from "@/components/admin/absensi/absensi-toolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canAccessAdminAbsensi } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getAbsensiData } from "@/lib/absensi/data";
import {
  filterAbsensiRows,
  getAbsensiRoleTabs,
  hasAbsensiFilters,
  parseAbsensiFilters,
  type AbsensiSearchParams,
} from "@/lib/absensi/filters";
import { getCurrentWibDateParam } from "@/lib/absensi/helpers";

export const metadata: Metadata = {
  title: "Absensi | KireiApp",
  description: "Read-only daily attendance grid.",
};

type AdminAbsensiPageProps = {
  searchParams: Promise<AbsensiSearchParams>;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

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
  const filters = parseAbsensiFilters(params);
  const hasFilters = hasAbsensiFilters(filters);
  const data = await getAbsensiData({ monthParam, staff });
  const filteredRows = filterAbsensiRows(data.rows, filters);
  const roleTabs = getAbsensiRoleTabs(data.rows);
  const canCorrectAbsensi = staff.profile.tier !== "member";
  const currentWibDate = getCurrentWibDateParam();
  const scopeLabel =
    staff.profile.tier === "member" ? "Self-only" : "All visible workers";
  const modeLabel = canCorrectAbsensi ? "Correction Controls" : "Read-only";
  const emptyTitle = hasFilters
    ? "No workers match these filters."
    : "No workers available.";
  const emptyDescription = hasFilters
    ? "Clear filters to return to the full readable Absensi view."
    : "Read-only attendance appears after worker profiles and attendance rows are available.";

  return (
    <div className="flex flex-col gap-4">
      {data.issues.length > 0 ? <AbsensiIssuePanel issues={data.issues} /> : null}

      <div className="sticky top-24 z-20">
        <AbsensiToolbar
          filters={filters}
          month={data.month}
          readableCount={numberFormatter.format(data.rows.length)}
          roleTabs={roleTabs}
          modeLabel={modeLabel}
          scopeLabel={scopeLabel}
          visibleCount={numberFormatter.format(filteredRows.length)}
        />
      </div>

      <AbsensiMonthGrid
        canCorrect={canCorrectAbsensi}
        currentWibDate={currentWibDate}
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        month={data.month}
        rows={filteredRows}
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
