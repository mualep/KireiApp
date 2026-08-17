"use client";

import { useMemo, useState } from "react";

import { RecordsOverrideDialog } from "@/components/admin/records/records-override-dialog";
import { RecordsSummaryCards } from "@/components/admin/records/records-summary-cards";
import { RecordsTable } from "@/components/admin/records/records-table";
import { RecordsToolbar } from "@/components/admin/records/records-toolbar";
import type { RecordsRowDTO } from "@/lib/records/data";
import type {
  RecordsFilters,
  RecordsRoleTab,
  RecordsSortOption,
} from "@/lib/records/filters";
import { filterRecordsRows } from "@/lib/records/filters";
import type { RecordsMonthRange } from "@/lib/records/helpers";

type RecordsClientShellProps = {
  canCorrectRecords: boolean;
  initialRows: RecordsRowDTO[];
  isOwner?: boolean;
  month: RecordsMonthRange;
  roleTabs: RecordsRoleTab[];
  scopeLabel: string | null;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export function RecordsClientShell({
  canCorrectRecords,
  initialRows,
  isOwner,
  month,
  roleTabs,
  scopeLabel,
}: RecordsClientShellProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RecordsFilters["role"]>(null);
  const [shift, setShift] = useState<string>("");
  const [sort, setSort] = useState<RecordsSortOption>("name-asc");

  const localFilters: RecordsFilters = useMemo(
    () => ({
      q: query,
      role,
      shift: shift === "" ? null : (shift as RecordsFilters["shift"]),
      sort,
    }),
    [query, role, shift, sort],
  );

  const filteredRows = useMemo(
    () => filterRecordsRows(initialRows, localFilters),
    [initialRows, localFilters],
  );

  const hasActiveFilters = Boolean(
    query.trim() || role !== null || shift !== "" || sort !== "name-asc",
  );

  function handleClearFilters() {
    setQuery("");
    setRole(null);
    setShift("");
    setSort("name-asc");
  }

  const emptyTitle = hasActiveFilters
    ? "No records match these filters."
    : "No records available.";

  const emptyDescription = hasActiveFilters
    ? "Clear filters to return to the full readable Records view."
    : "Read-only monthly records appear after worker records are available.";

  return (
    <div className="flex flex-col gap-6">
      <RecordsToolbar
        month={month}
        query={query}
        role={role}
        shift={shift}
        sort={sort}
        onQueryChange={setQuery}
        onRoleChange={setRole}
        onShiftChange={setShift}
        onSortChange={setSort}
        onClearFilters={handleClearFilters}
        readableCount={numberFormatter.format(initialRows.length)}
        roleTabs={roleTabs}
        scopeLabel={scopeLabel}
        visibleCount={numberFormatter.format(filteredRows.length)}
        isOwner={isOwner}
      />

      <RecordsSummaryCards rows={filteredRows} />

      <RecordsTable
        canCorrectRecords={canCorrectRecords}
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        monthParam={month.monthParam}
        monthLabel={month.monthLabel}
        rows={filteredRows}
      />
    </div>
  );
}
