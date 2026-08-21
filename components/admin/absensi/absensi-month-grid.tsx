"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, OctagonX } from "lucide-react";

import {
  AbsensiCorrectionDialog,
  type AbsensiCorrectionDraft,
} from "@/components/admin/absensi/absensi-correction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AbsensiCellDTO, AbsensiWorkerRowDTO, ScheduledCellDTO } from "@/lib/absensi/data";
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
  onOpenScheduleModal?: (userId: string, workerName: string, targetDate: string) => void;
  onOpenScheduledDetail?: (scheduled: ScheduledCellDTO & { workerName: string }) => void;
};

const statusCellClasses: Record<AbsensiCellDTO["status"], string> = {
  alpha: "border-status-alpha/35 bg-status-alpha/10 text-status-alpha",
  cuti: "border-status-cuti/35 bg-status-cuti/10 text-status-cuti",
  hadir: "border-status-on/35 bg-status-on/10 text-status-on",
  pending: "border-status-pending/35 bg-status-pending/10 text-status-pending",
  sakit: "border-status-sakit/35 bg-status-sakit/10 text-status-sakit",
};

const statusHoverClasses: Record<AbsensiCellDTO["status"], string> = {
  alpha: "hover:bg-status-alpha/25 hover:border-status-alpha/60 hover:brightness-125",
  cuti: "hover:bg-status-cuti/25 hover:border-status-cuti/60 hover:brightness-125",
  hadir: "hover:bg-status-on/25 hover:border-status-on/60 hover:brightness-125",
  pending: "hover:bg-status-pending/25 hover:border-status-pending/60 hover:brightness-125",
  sakit: "hover:bg-status-sakit/25 hover:border-status-sakit/60 hover:brightness-125",
};

const emptyCellClasses =
  "border-border/60 bg-background/30 text-muted-foreground/60";

const emptyHoverClasses =
  "hover:bg-muted/50 hover:text-foreground hover:border-border/80";

export function AbsensiMonthGrid({
  canCorrect,
  currentWibDate,
  emptyDescription = "Read-only attendance appears after worker profiles and attendance rows are available.",
  emptyTitle = "No workers available.",
  month,
  rows,
  onOpenScheduleModal,
  onOpenScheduledDetail,
}: AbsensiMonthGridProps) {
  const pathname = usePathname();
  const [selectedCorrection, setSelectedCorrection] =
    useState<AbsensiCorrectionDraft | null>(null);

  const previousMonthHref = `${pathname}?month=${month.previousMonthParam}`;
  const nextMonthHref = `${pathname}?month=${month.nextMonthParam}`;

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
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="icon-sm" className="size-7 rounded-lg">
              <Link href={previousMonthHref} aria-label="Previous Month">
                <ChevronLeftIcon aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2 px-1">
              <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary" />
              <h2 className="truncate text-sm font-bold">{month.monthLabel}</h2>
            </div>
            <Button asChild variant="outline" size="icon-sm" className="size-7 rounded-lg">
              <Link href={nextMonthHref} aria-label="Next Month">
                <ChevronRightIcon aria-hidden="true" className="size-4" />
              </Link>
            </Button>
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
                        className={cn(
                          "tracker-worker-name min-w-0 truncate font-bold leading-tight flex items-center gap-1.5",
                          row.activeSpCount === 1 && "text-status-break",
                          row.activeSpCount === 2 && "text-status-sakit",
                          row.activeSpCount >= 3 && "text-status-alpha",
                          row.activeSpCount === 0 && "text-foreground",
                        )}
                        translate="no"
                      >
                        <span>{row.name}</span>
                        {row.activeSpCount > 0 && (
                          <OctagonX className="size-3.5 shrink-0" aria-hidden="true" />
                        )}
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
                          onOpenScheduleModal={onOpenScheduleModal}
                          onOpenScheduledDetail={onOpenScheduledDetail}
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
  onOpenScheduleModal,
  onOpenScheduledDetail,
  row,
}: {
  canCorrect: boolean;
  cell: AbsensiCellDTO | undefined;
  currentWibDate: string;
  dateState: AbsensiDateState;
  day: string;
  onSelectCorrection: (correction: AbsensiCorrectionDraft) => void;
  onOpenScheduleModal?: (userId: string, workerName: string, targetDate: string) => void;
  onOpenScheduledDetail?: (scheduled: ScheduledCellDTO & { workerName: string }) => void;
  row: AbsensiWorkerRowDTO;
}) {
  const beforeStatus = cell?.status ?? "none";
  const isHistorical = day <= currentWibDate;
  const isFuture = dateState === "future";

  // 1. FUTURE DATE CELL HANDLING
  if (isFuture) {
    const scheduled = cell?.scheduledCell;

    if (!canCorrect) {
      // Member read-only view for future cells
      if (scheduled) {
        return (
          <span
            className={cn(
              "flex h-8 w-full items-center justify-center rounded-md border px-1 font-mono font-black text-[0.75rem] tabular-nums opacity-40 select-none",
              statusCellClasses[scheduled.status],
            )}
            title={`Jadwal Mendatang: ${scheduled.status.toUpperCase()} (${scheduled.targetDate})`}
            translate="no"
          >
            {absensiAttendanceInitials[scheduled.status]}
          </span>
        );
      }
      return (
        <span
          className="flex h-8 w-full items-center justify-center rounded-md border border-border/40 bg-background/20 text-muted-foreground/30 text-sm font-mono font-black"
          title="Belum ada absensi"
          translate="no"
        >
          -
        </span>
      );
    }

    // Admin/Owner interactive view for future cells
    if (scheduled) {
      return (
        <button
          type="button"
          aria-label={`Detail Jadwal ${row.name} tanggal ${day}`}
          className={cn(
            "flex h-8 w-full items-center justify-center rounded-md border px-1 font-mono font-extrabold text-[0.75rem] tabular-nums transition-all cursor-pointer opacity-40 hover:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            statusCellClasses[scheduled.status],
            statusHoverClasses[scheduled.status],
          )}
          title={`Klik untuk lihat/batalkan jadwal ${scheduled.status.toUpperCase()} (${day})`}
          onClick={() => {
            onOpenScheduledDetail?.({ ...scheduled, workerName: row.name });
          }}
          translate="no"
        >
          {absensiAttendanceInitials[scheduled.status]}
        </button>
      );
    }

    return (
      <button
        type="button"
        aria-label={`Jadwalkan ${row.name} tanggal ${day}`}
        className="flex h-8 w-full items-center justify-center rounded-md border border-border/30 bg-background/20 text-muted-foreground/35 text-sm font-mono font-black transition-all cursor-pointer opacity-50 hover:opacity-100 hover:bg-muted/40 hover:text-foreground hover:border-border/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        title={`Klik untuk jadwalkan absensi masa depan (${day})`}
        onClick={() => {
          onOpenScheduleModal?.(row.userId, row.name, day);
        }}
        translate="no"
      >
        -
      </button>
    );
  }

  // 2. HISTORICAL / TODAY CELL HANDLING
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
        "cursor-pointer transition-all focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        cell ? statusHoverClasses[cell.status] : emptyHoverClasses,
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
            workerGid: row.userId,
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
          workerGid: row.userId,
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
