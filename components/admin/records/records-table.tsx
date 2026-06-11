import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RecordsRowDTO } from "@/lib/records/data";
import {
  formatRecordsDuration,
  formatRecordsNumber,
  type EffectiveRecordMetric,
} from "@/lib/records/helpers";

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
        <table className="w-full min-w-[76rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/75 bg-background/35 text-muted-foreground">
              <th className="sticky left-0 z-10 w-64 bg-card/95 px-3 py-2 font-semibold backdrop-blur">
                Worker
              </th>
              <th className="px-3 py-2 font-semibold">Work Late</th>
              <th className="px-3 py-2 font-semibold">Break Late</th>
              <th className="px-3 py-2 font-semibold">Alpha</th>
              <th className="px-3 py-2 font-semibold">Sakit</th>
              <th className="px-3 py-2 font-semibold">Pending</th>
              <th className="px-3 py-2 font-semibold">Lembur</th>
              <th className="px-3 py-2 font-semibold">Cuti Stock</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Updated</th>
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
                  <span
                    className="mt-1 block truncate font-mono text-[0.65rem] text-muted-foreground"
                    translate="no"
                  >
                    {row.roleShiftLabel}
                  </span>
                </th>
                <td className="px-3 py-2">
                  <MetricValue metric={row.workLateSeconds} type="duration" />
                </td>
                <td className="px-3 py-2">
                  <MetricValue metric={row.breakLateSeconds} type="duration" />
                </td>
                <td className="px-3 py-2">
                  <MetricValue metric={row.alphaCount} />
                </td>
                <td className="px-3 py-2">
                  <MetricValue metric={row.sakitDays} />
                </td>
                <td className="px-3 py-2">
                  <MetricValue metric={row.pendingDays} />
                </td>
                <td className="px-3 py-2">
                  <MetricValue metric={row.lemburUnits} />
                </td>
                <td className="px-3 py-2">
                  <MetricValue metric={row.cutiStockSnapshot} />
                </td>
                <td className="px-3 py-2">
                  <span className="block font-mono text-[0.7rem] uppercase text-foreground">
                    {row.lastSource ?? "-"}
                  </span>
                  <span className="block max-w-44 truncate font-mono text-[0.65rem] text-muted-foreground">
                    {row.lastSourceAction ?? "-"}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[0.7rem] text-muted-foreground">
                  {row.updatedAt
                    ? updatedAtFormatter.format(new Date(row.updatedAt))
                    : "-"}
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
  type = "number",
}: {
  metric: EffectiveRecordMetric<number | null>;
  type?: "duration" | "number";
}) {
  const value =
    type === "duration" && metric.value !== null
      ? formatRecordsDuration(metric.value)
      : formatRecordsNumber(metric.value);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="font-mono font-bold tabular-nums" translate="no">
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
