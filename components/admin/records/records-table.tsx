"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecordsOverrideDialog } from "@/components/admin/records/records-override-dialog";
import type { RecordsRowDTO } from "@/lib/records/data";
import {
  formatRecordsDuration,
  formatRecordsNumber,
  type EffectiveRecordMetric,
} from "@/lib/records/helpers";
import { cn } from "@/lib/utils";
import { OctagonX } from "lucide-react";

type RecordsTableProps = {
  canCorrectRecords?: boolean;
  emptyDescription?: string;
  emptyTitle?: string;
  monthParam?: string;
  monthLabel: string;
  rows: RecordsRowDTO[];
};

const updatedAtFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "Asia/Jakarta",
  year: "numeric",
});

const recordsMetricToneClasses = {
  alpha: "text-status-alpha",
  breakLate: "text-status-sakit",
  cuti: "text-status-cuti",
  lembur: "text-status-break",
  pending: "text-status-pending",
  sakit: "text-status-sakit",
  workLate: "text-status-break",
} as const;

type RecordsMetricTone = keyof typeof recordsMetricToneClasses;

export function RecordsTable({
  canCorrectRecords = false,
  emptyDescription = "Read-only monthly records appear after worker records are available.",
  emptyTitle = "No records available.",
  monthParam = "",
  monthLabel,
  rows,
}: RecordsTableProps) {
  const [overrideTarget, setOverrideTarget] = useState<RecordsRowDTO | null>(null);

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
        aria-label="Read-only monthly worker records"
        className="tracker-glass-panel overflow-hidden rounded-2xl border"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/75 px-3 py-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">Records</h2>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-border bg-background/35 px-2 text-[0.65rem] text-muted-foreground"
          >
            {rows.length} records
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/75 bg-background/35 text-muted-foreground">
                <th className="sticky left-0 z-10 w-[14rem] min-w-[12rem] max-w-[16rem] bg-card/95 px-3 py-2 font-semibold backdrop-blur">
                  Worker
                </th>
                <th className="px-3 py-2 text-center font-semibold">Work Late</th>
                <th className="px-3 py-2 text-center font-semibold">Break Late</th>
                <th className="px-3 py-2 text-center font-semibold">Alpha</th>
                <th className="px-3 py-2 text-center font-semibold">Sakit</th>
                <th className="px-3 py-2 text-center font-semibold">Pending</th>
                <th className="px-3 py-2 text-center font-semibold">Lembur</th>
                <th className="px-3 py-2 text-center font-semibold">Cuti</th>
                <th className="px-3 py-2 text-center font-semibold">Updated</th>
                {canCorrectRecords ? (
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                ) : null}
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
                      <div
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
                      </div>
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
                  <td className="px-3 py-2 text-center">
                    <MetricValue
                      metric={row.workLateSeconds}
                      tone="workLate"
                      type="duration"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MetricValue
                      metric={row.breakLateSeconds}
                      tone="breakLate"
                      type="duration"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MetricValue metric={row.alphaCount} tone="alpha" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MetricValue metric={row.sakitDays} tone="sakit" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MetricValue metric={row.pendingDays} tone="pending" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MetricValue metric={row.lemburUnits} tone="lembur" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MetricValue metric={row.cutiStockSnapshot} tone="cuti" />
                  </td>
                  <td className="px-3 py-2 text-center font-sans text-[0.7rem] tabular-nums text-muted-foreground">
                    {row.updatedAt
                      ? updatedAtFormatter.format(new Date(row.updatedAt))
                      : "-"}
                  </td>
                  {canCorrectRecords ? (
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-[0.7rem]"
                        onClick={() => setOverrideTarget(row)}
                      >
                        Edit
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {overrideTarget ? (
        <RecordsOverrideDialog
          isOpen={!!overrideTarget}
          onOpenChange={(open) => !open && setOverrideTarget(null)}
          periodMonth={monthParam}
          row={overrideTarget}
        />
      ) : null}
    </>
  );
}

function MetricValue({
  metric,
  tone,
  type = "number",
}: {
  metric: EffectiveRecordMetric<number | null>;
  tone: RecordsMetricTone;
  type?: "duration" | "number";
}) {
  const value =
    type === "duration" && metric.value !== null
      ? formatRecordsDuration(metric.value)
      : formatRecordsNumber(metric.value);

  return (
    <span className="inline-flex min-w-0 items-center justify-center">
      <span
        className={cn(
          "font-sans font-bold tabular-nums",
          metric.value && metric.value > 0
            ? recordsMetricToneClasses[tone]
            : "text-muted-foreground/45",
        )}
        translate="no"
      >
        {value}
      </span>
    </span>
  );
}
