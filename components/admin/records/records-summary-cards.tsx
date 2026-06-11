import { ActivityIcon, AlertTriangleIcon, ClockIcon, UsersIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecordsRowDTO } from "@/lib/records/data";
import { formatRecordsDuration } from "@/lib/records/helpers";

type RecordsSummaryCardsProps = {
  rows: RecordsRowDTO[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export function RecordsSummaryCards({ rows }: RecordsSummaryCardsProps) {
  const totals = rows.reduce(
    (summary, row) => ({
      alpha: summary.alpha + row.alphaCount.value,
      breakLateSeconds: summary.breakLateSeconds + row.breakLateSeconds.value,
      pending: summary.pending + row.pendingDays.value,
      sakit: summary.sakit + row.sakitDays.value,
      workLateSeconds: summary.workLateSeconds + row.workLateSeconds.value,
    }),
    {
      alpha: 0,
      breakLateSeconds: 0,
      pending: 0,
      sakit: 0,
      workLateSeconds: 0,
    },
  );

  const cards = [
    {
      description: "readable workers",
      icon: UsersIcon,
      label: "Workers",
      value: numberFormatter.format(rows.length),
    },
    {
      description: "work-late total",
      icon: ClockIcon,
      label: "Work Late",
      value: formatRecordsDuration(totals.workLateSeconds),
    },
    {
      description: "break-late total",
      icon: ActivityIcon,
      label: "Break Late",
      value: formatRecordsDuration(totals.breakLateSeconds),
    },
    {
      description: "alpha / sakit / pending",
      icon: AlertTriangleIcon,
      label: "Absence",
      value: `${totals.alpha}/${totals.sakit}/${totals.pending}`,
    },
  ];

  return (
    <section
      aria-label="Records monthly summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label} size="sm" className="tracker-glass-panel rounded-xl border">
            <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="mt-1 font-mono text-xl font-black tabular-nums">
                  {card.value}
                </CardTitle>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg border border-border/75 bg-background/45 text-primary">
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
