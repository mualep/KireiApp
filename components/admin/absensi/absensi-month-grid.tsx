"use client";

import { useState } from "react";
import { CalendarDaysIcon, IdCardIcon } from "lucide-react";

import {
  AbsensiCorrectionDialog,
  type AbsensiCorrectionDraft,
} from "@/components/admin/absensi/absensi-correction-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AbsensiCellDTO, AbsensiWorkerRowDTO } from "@/lib/absensi/data";
import {
  absensiAttendanceInitials,
  getAbsensiDayNumber,
  type AbsensiMonthRange,
} from "@/lib/absensi/helpers";

type AbsensiMonthGridProps = {
  canCorrect: boolean;
  currentWibDate: string;
  month: AbsensiMonthRange;
  rows: AbsensiWorkerRowDTO[];
};

const statusCellClasses: Record<AbsensiCellDTO["status"], string> = {
  alpha: "border-status-alpha/35 bg-status-alpha/10 text-status-alpha",
  cuti: "border-status-cuti/35 bg-status-cuti/10 text-status-cuti",
  hadir: "border-status-on/35 bg-status-on/10 text-status-on",
  pending: "border-status-pending/35 bg-status-pending/10 text-status-pending",
  sakit: "border-status-sakit/35 bg-status-sakit/10 text-status-sakit",
};

const emptyCellClasses =
  "border-border/60 bg-background/30 text-muted-foreground/60";

export function AbsensiMonthGrid({
  canCorrect,
  currentWibDate,
  month,
  rows,
}: AbsensiMonthGridProps) {
  const [selectedCorrection, setSelectedCorrection] =
    useState<AbsensiCorrectionDraft | null>(null);

  if (rows.length === 0) {
    return (
      <Card className="tracker-glass-panel rounded-2xl border">
        <CardContent className="p-6">
          <p className="text-sm font-semibold">No workers available.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Read-only attendance appears after worker profiles and attendance rows are
            available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <section
        aria-label="Read-only attendance month grid"
        className="tracker-glass-panel overflow-hidden rounded-2xl border"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/75 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary" />
            <h2 className="truncate text-sm font-bold">{month.monthLabel}</h2>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-border bg-background/35 px-2 text-[0.65rem] text-muted-foreground"
          >
            {rows.length} workers
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/75 bg-background/35 text-muted-foreground">
                <th className="sticky left-0 z-10 w-56 bg-card/95 px-3 py-2 font-semibold backdrop-blur">
                  Worker
                </th>
                {month.days.map((day) => (
                  <th
                    key={day}
                    className="w-16 px-1.5 py-2 text-center font-mono font-semibold tabular-nums"
                    translate="no"
                  >
                    {getAbsensiDayNumber(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b border-border/55 last:border-b-0"
                >
                  <th className="sticky left-0 z-10 bg-card/95 px-3 py-2 backdrop-blur">
                    <span className="block truncate font-bold" translate="no">
                      {row.name}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                      <IdCardIcon data-icon="inline-start" aria-hidden="true" />
                      <span className="truncate font-mono" translate="no">
                        {row.gid}
                      </span>
                      <span className="truncate">{row.shift}</span>
                    </span>
                  </th>
                  {month.days.map((day) => (
                    <td key={`${row.userId}-${day}`} className="px-1.5 py-1.5">
                      <AbsensiCell
                        canCorrect={canCorrect}
                        cell={row.cellsByDate[day]}
                        currentWibDate={currentWibDate}
                        day={day}
                        onSelectCorrection={setSelectedCorrection}
                        row={row}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <AbsensiCorrectionDialog
        correction={selectedCorrection}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCorrection(null);
          }
        }}
      />
    </>
  );
}

function AbsensiCell({
  canCorrect,
  cell,
  currentWibDate,
  day,
  onSelectCorrection,
  row,
}: {
  canCorrect: boolean;
  cell: AbsensiCellDTO | undefined;
  currentWibDate: string;
  day: string;
  onSelectCorrection: (correction: AbsensiCorrectionDraft) => void;
  row: AbsensiWorkerRowDTO;
}) {
  const beforeStatus = cell?.status ?? "none";
  const isHistorical = day < currentWibDate;
  const canOpenCorrection = canCorrect && isHistorical;
  const label = cell?.label ?? "No recorded attendance";
  const title = getCellTitle({
    canCorrect,
    cell,
    isHistorical,
  });
  const cellClassName = cn(
    "flex h-8 w-full items-center justify-center rounded-md border px-1 font-mono font-black tabular-nums transition-colors",
    cell ? "text-[0.75rem]" : "text-sm",
    cell ? statusCellClasses[cell.status] : emptyCellClasses,
  );

  if (!canOpenCorrection) {
    return (
      <span className={cellClassName} title={title} translate="no">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true">
          {cell ? absensiAttendanceInitials[cell.status] : "-"}
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Correct ${row.name} Absensi on ${day}`}
      className={cn(
        cellClassName,
        "cursor-pointer hover:bg-primary/10 hover:text-primary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
      title={title}
      onClick={() => {
        if (beforeStatus === "none") {
          onSelectCorrection({
            attendanceDate: day,
            beforeLabel: "No recorded attendance",
            beforeStatus,
            expectedAttendanceId: null,
            expectedAttendanceUpdatedAt: null,
            targetUserId: row.userId,
            workerGid: row.gid,
            workerName: row.name,
          });
          return;
        }

        if (!cell) {
          return;
        }

        onSelectCorrection({
          attendanceDate: day,
          beforeLabel: cell.label,
          beforeStatus,
          expectedAttendanceId: cell.attendanceId,
          expectedAttendanceUpdatedAt: cell.attendanceUpdatedAt,
          targetUserId: row.userId,
          workerGid: row.gid,
          workerName: row.name,
        });
      }}
      translate="no"
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {cell ? absensiAttendanceInitials[cell.status] : "-"}
      </span>
    </button>
  );
}

function getCellTitle({
  canCorrect,
  cell,
  isHistorical,
}: {
  canCorrect: boolean;
  cell: AbsensiCellDTO | undefined;
  isHistorical: boolean;
}) {
  if (!canCorrect) {
    return cell ? `${cell.label} - ${cell.sourceAction}` : "No recorded attendance";
  }

  if (!isHistorical) {
    return "Historical corrections only";
  }

  return cell ? `Correct ${cell.label} - ${cell.sourceAction}` : "Correct empty day";
}
