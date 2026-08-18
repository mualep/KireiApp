import {
  BookAlertIcon,
  ClockAlertIcon,
  ClockPlusIcon,
  HeartOffIcon,
  MessageCircleWarningIcon,
  UserPenIcon,
  UtensilsIcon,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecordsRowDTO } from "@/lib/records/data";
import { cn } from "@/lib/utils";

type RecordsSummaryCardsProps = {
  rows: RecordsRowDTO[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatDurationNoSpace(seconds: number): string {
  if (seconds <= 0) return "0m";
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours === 0) return `${remMins}m`;
  return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`;
}

function formatLemburMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export function RecordsSummaryCards({ rows }: RecordsSummaryCardsProps) {
  const totals = rows.reduce(
    (summary, row) => ({
      alphaDays: summary.alphaDays + row.alphaCount.value,
      breakLateSeconds: summary.breakLateSeconds + row.breakLateSeconds.value,
      cutiDays: summary.cutiDays + (row.cutiStockSnapshot.value || 0),
      lembur: summary.lembur + row.lemburUnits.value,
      pending: summary.pending + row.pendingDays.value,
      sakit: summary.sakit + row.sakitDays.value,
      workLateSeconds: summary.workLateSeconds + row.workLateSeconds.value,
    }),
    {
      alphaDays: 0,
      breakLateSeconds: 0,
      cutiDays: 0,
      lembur: 0,
      pending: 0,
      sakit: 0,
      workLateSeconds: 0,
    },
  );

  const cards = [
    {
      icon: ClockAlertIcon,
      label: "Total Work Late",
      toneClass: "border-status-break/35 bg-status-break/10 text-status-break",
      value: formatDurationNoSpace(totals.workLateSeconds),
    },
    {
      icon: UtensilsIcon,
      label: "Total Break Late",
      toneClass: "border-status-sakit/35 bg-status-sakit/10 text-status-sakit",
      value: formatDurationNoSpace(totals.breakLateSeconds),
    },
    {
      icon: BookAlertIcon,
      label: "Total Alpha",
      toneClass: "border-status-alpha/35 bg-status-alpha/10 text-status-alpha",
      value: `${numberFormatter.format(totals.alphaDays)} Hari`,
    },
    {
      icon: HeartOffIcon,
      label: "Total Sakit",
      toneClass: "border-status-sakit/35 bg-status-sakit/10 text-status-sakit",
      value: `${numberFormatter.format(totals.sakit)} Hari`,
    },
    {
      icon: MessageCircleWarningIcon,
      label: "Total Pending",
      toneClass: "border-status-pending/35 bg-status-pending/10 text-status-pending",
      value: `${numberFormatter.format(totals.pending)} Hari`,
    },
    {
      icon: UserPenIcon,
      label: "Total Cuti",
      toneClass: "border-status-cuti/35 bg-status-cuti/10 text-status-cuti",
      value: `${numberFormatter.format(totals.cutiDays)} Hari`,
    },
    {
      icon: ClockPlusIcon,
      label: "Total Lembur",
      toneClass: "border-status-break/35 bg-status-break/10 text-status-break",
      value: formatLemburMinutes(totals.lembur),
    },
  ];

  return (
    <section
      aria-label="Records monthly summary"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label} size="sm" className="tracker-glass-panel rounded-xl border">
            <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3 p-4">
              <div>
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  {card.label}
                </CardDescription>
                <CardTitle className="mt-1 font-sans text-xl font-black tabular-nums text-foreground">
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
