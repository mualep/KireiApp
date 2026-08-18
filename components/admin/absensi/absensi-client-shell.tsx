"use client";

import { useMemo, useState } from "react";

import { AbsensiMonthGrid } from "@/components/admin/absensi/absensi-month-grid";
import { AbsensiToolbar } from "@/components/admin/absensi/absensi-toolbar";
import { ScheduleAttendanceModal } from "@/components/admin/absensi/schedule-attendance-modal";
import { ScheduledCellDetailDialog } from "@/components/admin/absensi/scheduled-cell-detail-dialog";
import type { AbsensiWorkerRowDTO, ScheduledCellDTO } from "@/lib/absensi/data";
import type {
  AbsensiFilters,
  AbsensiRoleTab,
  AbsensiSortOption,
} from "@/lib/absensi/filters";
import { filterAbsensiRows } from "@/lib/absensi/filters";
import type { AbsensiMonthRange } from "@/lib/absensi/helpers";

type AbsensiClientShellProps = {
  canCorrect: boolean;
  currentWibDate: string;
  initialRows: AbsensiWorkerRowDTO[];
  month: AbsensiMonthRange;
  roleTabs: AbsensiRoleTab[];
  scopeLabel: string | null;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export function AbsensiClientShell({
  canCorrect,
  currentWibDate,
  initialRows,
  month,
  roleTabs,
  scopeLabel,
}: AbsensiClientShellProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AbsensiFilters["role"]>(null);
  const [shift, setShift] = useState<string>("");
  const [sort, setSort] = useState<AbsensiSortOption>("name-asc");

  // Grid scheduling states
  const [scheduleFormTarget, setScheduleFormTarget] = useState<{
    userId: string;
    workerName: string;
    targetDate: string;
  } | null>(null);

  const [scheduledDetail, setScheduledDetail] = useState<
    (ScheduledCellDTO & { workerName: string }) | null
  >(null);

  const workers = useMemo(
    () => initialRows.map((r) => ({ id: r.userId, name: r.name })),
    [initialRows]
  );

  const localFilters: AbsensiFilters = useMemo(
    () => ({
      q: query,
      role,
      shift: shift === "" ? null : (shift as AbsensiFilters["shift"]),
      sort,
    }),
    [query, role, shift, sort],
  );

  const filteredRows = useMemo(
    () => filterAbsensiRows(initialRows, localFilters),
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
    ? "No workers match these filters."
    : "No workers available.";

  const emptyDescription = hasActiveFilters
    ? "Clear filters to return to the full readable Absensi view."
    : "Read-only attendance appears after worker profiles and attendance rows are available.";

  return (
    <div className="flex flex-col gap-6">
      <AbsensiToolbar
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
      />

      <AbsensiMonthGrid
        canCorrect={canCorrect}
        currentWibDate={currentWibDate}
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        month={month}
        rows={filteredRows}
        onOpenScheduleModal={(userId, workerName, targetDate) => {
          setScheduleFormTarget({ userId, workerName, targetDate });
        }}
        onOpenScheduledDetail={(scheduled) => {
          setScheduledDetail(scheduled);
        }}
      />

      {/* Modal Penjadwalan Absensi Masa Depan (Pre-filled dari klik sel matriks) */}
      <ScheduleAttendanceModal
        open={Boolean(scheduleFormTarget)}
        onOpenChange={(open) => {
          if (!open) setScheduleFormTarget(null);
        }}
        workers={workers}
        initialUserId={scheduleFormTarget?.userId}
        initialWorkerName={scheduleFormTarget?.workerName}
        initialTargetDate={scheduleFormTarget?.targetDate}
      />

      {/* Dialog Detail / Pembatalan Penjadwalan (Klik sel yang sudah terjadwal) */}
      <ScheduledCellDetailDialog
        scheduled={scheduledDetail}
        onOpenChange={(open) => {
          if (!open) setScheduledDetail(null);
        }}
        canManage={canCorrect}
      />
    </div>
  );
}
