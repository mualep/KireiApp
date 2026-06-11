import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RecordsRowDTO } from "@/lib/records/data";
import {
  formatRecordsDuration,
  formatRecordsNumber,
  type EffectiveRecordMetric,
} from "@/lib/records/helpers";
import { cn } from "@/lib/utils";

type RecordsTableProps = {
  emptyDescription?: string;
  emptyTitle?: string;
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
  emptyDescription = "Read-only monthly records appear after worker records are available.",
  emptyTitle = "No records available.",
  monthLabel,
  rows,
}: RecordsTableProps) {
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
        <table className="w-full min-w-[72rem] border-collapse text-left text-xs">
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
              <th className="px-3 py-2 text-right font-semibold">Action</th>
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
                      className="tracker-worker-name min-w-0 truncate font-bold leading-tight text-foreground"
                      translate="no"
                    >
                      {row.name}
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
                <td className="px-3 py-2 text-right">
                  <Button
                    aria-disabled="true"
                    disabled
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-[0.7rem]"
                  >Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
    <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
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
      {metric.isOverride ? (
        <Badge
          variant="outline"
          className="h-5 rounded-md border-primary/35 bg-primary/10 px-1.5 text-[0.6rem] text-primary"
        >
          Override
        </Badge>
      ) : null}
    </span>
  );
}
