import {
  ActivityIcon,
  AlertTriangleIcon,
  BriefcaseBusinessIcon,
  ClockIcon,
  HeartPulseIcon,
  HourglassIcon,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecordsRowDTO } from "@/lib/records/data";
import { formatRecordsSummaryDuration } from "@/lib/records/helpers";
import { cn } from "@/lib/utils";

type RecordsSummaryCardsProps = {
  rows: RecordsRowDTO[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export function RecordsSummaryCards({ rows }: RecordsSummaryCardsProps) {
  const totals = rows.reduce(
    (summary, row) => ({
      alphaWorkers: summary.alphaWorkers + (row.alphaCount.value > 0 ? 1 : 0),
      breakLateSeconds: summary.breakLateSeconds + row.breakLateSeconds.value,
      lembur: summary.lembur + row.lemburUnits.value,
      pending: summary.pending + row.pendingDays.value,
      sakit: summary.sakit + row.sakitDays.value,
      workLateSeconds: summary.workLateSeconds + row.workLateSeconds.value,
    }),
    {
      alphaWorkers: 0,
      breakLateSeconds: 0,
      lembur: 0,
      pending: 0,
      sakit: 0,
      workLateSeconds: 0,
    },
  );

  const cards = [
    {
      icon: ClockIcon,
      label: "Total Work Late",
      toneClass: "border-status-break/30 bg-status-break/10 text-status-break",
      value: formatRecordsSummaryDuration(totals.workLateSeconds),
    },
    {
      icon: ActivityIcon,
      label: "Total Break Late",
      toneClass: "border-status-sakit/30 bg-status-sakit/10 text-status-sakit",
      value: formatRecordsSummaryDuration(totals.breakLateSeconds),
    },
    {
      icon: AlertTriangleIcon,
      label: "Total Alpha",
      toneClass: "border-status-alpha/30 bg-status-alpha/10 text-status-alpha",
      value: `${numberFormatter.format(totals.alphaWorkers)} orang`,
    },
    {
      icon: HeartPulseIcon,
      label: "Total Sakit",
      toneClass: "border-status-sakit/30 bg-status-sakit/10 text-status-sakit",
      value: `${numberFormatter.format(totals.sakit)} d`,
    },
    {
      icon: HourglassIcon,
      label: "Total Pending",
      toneClass: "border-status-pending/30 bg-status-pending/10 text-status-pending",
      value: `${numberFormatter.format(totals.pending)} d`,
    },
    {
      icon: BriefcaseBusinessIcon,
      label: "Total Lembur",
      toneClass: "border-status-break/35 bg-status-break/10 text-status-break",
      value: formatLemburMinutes(totals.lembur),
    },
  ];

  function formatLemburMinutes(minutes: number): string {
    if (minutes <= 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  }

  return (
    <section
      aria-label="Records monthly summary"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label} size="sm" className="tracker-glass-panel rounded-xl border">
            <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="mt-1 font-sans text-xl font-black tabular-nums">
                  {card.value}
                </CardTitle>
              </div>
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border",
                  card.toneClass,
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </CardHeader>
          </Card>
        );
      })}
    </section>
  );
}
