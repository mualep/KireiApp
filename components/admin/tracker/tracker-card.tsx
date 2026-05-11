import { IdCardIcon, ShieldIcon } from "lucide-react";

import { TrackerActionControls } from "@/components/admin/tracker/tracker-action-controls";
import { TrackerStatusBadge } from "@/components/admin/tracker/tracker-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  TrackerCardDTO,
  WorkerDisplayStatus,
  WorkerRole,
} from "@/lib/workers";

type TrackerCardProps = {
  card: TrackerCardDTO;
  canApplyTrackerActions: boolean;
  updatedAtText: string;
};

const cardToneClasses: Record<WorkerDisplayStatus, string> = {
  ALPHA: "tracker-status-alpha",
  BREAK: "tracker-status-break",
  CUTI: "tracker-status-cuti",
  LATE: "tracker-status-late",
  LEMBUR: "tracker-status-lembur",
  OFF: "tracker-status-off",
  ON: "tracker-status-on",
  PENDING: "tracker-status-pending",
  SAKIT: "tracker-status-sakit",
};

const compactRoleLabels: Record<WorkerRole, string> = {
  "Cleaning Service": "Cleaning",
  "Customer Service": "CS",
  "Expert Player": "EP",
  Explorer: "Explorer",
  Internship: "Internship",
  "Professional Player": "PP",
  Security: "Security",
};

export function TrackerCard({
  card,
  canApplyTrackerActions,
  updatedAtText,
}: TrackerCardProps) {
  const roleShiftLabel = getRoleShiftLabel(card);

  return (
    <Card
      size="sm"
      className={cn(
        "tracker-worker-card tracker-glass-panel tracker-card-tone relative gap-0 overflow-hidden rounded-xl border py-0",
        cardToneClasses[card.displayStatus],
      )}
    >
      <CardHeader className="relative z-10 p-3 pb-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base font-black" translate="no">
              {card.name}
            </CardTitle>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className="h-5 max-w-[9rem] border-border bg-background/45 px-1.5 text-[0.65rem] text-muted-foreground"
                translate="no"
              >
                <span className="truncate">{roleShiftLabel}</span>
              </Badge>
              <Badge
                variant="outline"
                className="h-5 max-w-[7rem] border-border bg-background/35 px-1.5 font-mono text-[0.65rem] text-muted-foreground"
                translate="no"
              >
                <IdCardIcon data-icon="inline-start" aria-hidden="true" />
                <span className="truncate">{card.gid}</span>
              </Badge>
            </div>
          </div>
          <TrackerStatusBadge status={card.displayStatus} />
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col gap-2 p-3 pt-1.5">
        <div className="flex flex-wrap gap-1.5">
          <MetricChip label="Cuti" tone="cuti" value={`${card.cutiStock}x`} />
          <MetricChip
            label="Stored"
            tone="status"
            value={card.storedStatus.toUpperCase()}
          />
          <MetricChip
            label="Updated"
            tone="muted"
            value={updatedAtText}
            translateValue={false}
          />
          <MetricChip label="V" tone="muted" value={String(card.version)} />
        </div>

        <TrackerControlZone
          card={card}
          canApplyTrackerActions={canApplyTrackerActions}
        />
      </CardContent>
    </Card>
  );
}

function MetricChip({
  label,
  tone,
  translateValue = true,
  value,
}: {
  label: string;
  tone: "cuti" | "muted" | "status";
  translateValue?: boolean;
  value: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-0 max-w-full items-center gap-1 rounded-md border px-1.5 text-[0.65rem] text-muted-foreground",
        tone === "cuti" && "border-status-cuti/20 bg-status-cuti/5",
        tone === "status" &&
          "border-[color-mix(in_oklch,var(--tracker-status-color)_18%,var(--border))] bg-background/45",
        tone === "muted" && "border-border/75 bg-background/45",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className="truncate font-mono font-bold text-foreground"
        translate={translateValue ? "no" : undefined}
        title={value}
      >
        {value}
      </span>
    </span>
  );
}

function TrackerControlZone({
  card,
  canApplyTrackerActions,
}: {
  card: TrackerCardDTO;
  canApplyTrackerActions: boolean;
}) {
  if (!canApplyTrackerActions) {
    return (
      <div className="rounded-lg border border-border/75 bg-background/35 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        <ShieldIcon data-icon="inline-start" aria-hidden="true" />
        Self View
      </div>
    );
  }

  return (
    <div
      aria-label="Tracker controls"
      className="relative grid gap-1.5 rounded-lg border border-border/80 bg-background/30 p-1.5"
    >
      <span className="pointer-events-none absolute right-2 top-2 rounded border border-border bg-background/65 px-1.5 py-0.5 text-[0.58rem] font-bold text-muted-foreground">
        R2C
      </span>
      <TrackerActionControls card={card} />
    </div>
  );
}

function getRoleShiftLabel(card: TrackerCardDTO): string {
  const role = compactRoleLabels[card.employeeRole];

  if (card.isFlexible) {
    return `${role} • Flexible`;
  }

  return `${role}-${card.shift}`;
}
