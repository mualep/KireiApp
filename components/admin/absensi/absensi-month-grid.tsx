"use client";

import { useState } from "react";
import { CalendarDaysIcon } from "lucide-react";

import {
  AbsensiCorrectionDialog,
  type AbsensiCorrectionDraft,
} from "@/components/admin/absensi/absensi-correction-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
  emptyDescription?: string;
  emptyTitle?: string;
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
  emptyDescription = "Read-only attendance appears after worker profiles and attendance rows are available.",
  emptyTitle = "No workers available.",
  month,
  rows,
}: AbsensiMonthGridProps) {
  const [selectedCorrection, setSelectedCorrection] =
    useState<AbsensiCorrectionDraft | null>(null);

  if (rows.length === 0) {
    return (
      <Card className="tracker-glass-panel rounded-2xl border">
        <CardContent className="p-6">
          <p className="text-sm font-semibold">{emptyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {emptyDescription}
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
                <th className="sticky left-0 z-10 w-[14rem] min-w-[12rem] max-w-[16rem] bg-card/95 px-3 py-2 font-semibold backdrop-blur">
                  Worker
                </th>
                {month.days.map((day) => {
                  const dateState = getAbsensiDateState(day, currentWibDate);

                  return (
                    <th
                      key={day}
                      className={cn(
                        "w-16 px-1.5 py-2 text-center font-mono font-semibold tabular-nums",
                        dateState === "past" && "text-muted-foreground/75",
                        dateState === "today" &&
                          "bg-status-on/10 text-status-on ring-1 ring-inset ring-status-on/25",
                        dateState === "future" && "text-muted-foreground/45",
                      )}
                      data-date-state={dateState}
                      translate="no"
                    >
                      {getAbsensiDayNumber(day)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b border-border/55 last:border-b-0"
                >
                  <th className="sticky left-0 z-10 w-[14rem] min-w-[12rem] max-w-[16rem] bg-card/95 px-3 py-2 backdrop-blur">
                    <div className="min-w-0">
                      <CardTitle
                        className="tracker-worker-name min-w-0 truncate font-bold leading-tight text-foreground"
                        translate="no"
                      >
                        {row.name}
                      </CardTitle>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="tracker-role-shift-badge h-6 max-w-[14rem] rounded-sm border-border/80 bg-background/45 px-2.5 py-1 text-[0.68rem] text-muted-foreground"
                          translate="no"
                        >
                          <span className="hidden truncate @[14rem]:inline">
                            {row.roleShiftLabel}
                          </span>
                          <span className="truncate @[14rem]:hidden">
                            {row.compactRoleShiftLabel}
                          </span>
                        </Badge>
                        {row.shiftTimeLabel ? (
                          <span
                            className="text-[0.6rem] font-medium text-muted-foreground/70"
                            translate="no"
                          >
                            {row.shiftTimeLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </th>
                  {month.days.map((day) => {
                    const dateState = getAbsensiDateState(day, currentWibDate);

                    return (
                      <td
                        key={`${row.userId}-${day}`}
                        className={cn(
                          "px-1.5 py-1.5",
                          dateState === "today" && "bg-status-on/5",
                          dateState === "future" && "bg-muted/15",
                        )}
                        data-date-state={dateState}
                      >
                        <AbsensiCell
                          canCorrect={canCorrect}
                          cell={row.cellsByDate[day]}
                          currentWibDate={currentWibDate}
                          dateState={dateState}
                          day={day}
                          onSelectCorrection={setSelectedCorrection}
                          row={row}
                        />
                      </td>
                    );
                  })}
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
  dateState,
  day,
  onSelectCorrection,
  row,
}: {
  canCorrect: boolean;
  cell: AbsensiCellDTO | undefined;
  currentWibDate: string;
  dateState: AbsensiDateState;
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
    dateState === "past" && "opacity-80",
    dateState === "future" && "opacity-55 grayscale",
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

type AbsensiDateState = "past" | "today" | "future";

function getAbsensiDateState(
  day: string,
  currentWibDate: string,
): AbsensiDateState {
  if (day < currentWibDate) {
    return "past";
  }

  if (day === currentWibDate) {
    return "today";
  }

  return "future";
}
