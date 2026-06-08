import { ShieldIcon } from "lucide-react";

import { TrackerActionControls } from "@/components/admin/tracker/tracker-action-controls";
import { TrackerStatusBadge } from "@/components/admin/tracker/tracker-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getShiftDefinition,
  type TrackerCardDTO,
  type WorkerDisplayStatus,
  type WorkerRole,
} from "@/lib/workers";

type TrackerCardProps = {
  card: TrackerCardDTO;
  canApplyTrackerActions: boolean;
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
}: TrackerCardProps) {
  const roleShiftLabel = getRoleShiftLabel(card);
  const shiftTimeLabel = getShiftTimeLabel(card);

  return (
    <Card
      size="sm"
      className={cn(
        "tracker-worker-card tracker-glass-panel tracker-card-tone relative gap-0 overflow-hidden rounded-xl border py-0",
        cardToneClasses[card.displayStatus],
      )}
    >
      <CardHeader className="relative z-10 p-3 pb-2">
        <div
          aria-label="Worker Identity"
          className="flex min-w-0 items-start justify-between gap-3"
          data-slot="tracker-card-identity"
        >
          <div className="min-w-0">
            <CardTitle
              className="truncate text-base font-black leading-tight text-foreground"
              translate="no"
            >
              {card.name}
            </CardTitle>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="h-5 max-w-[9rem] border-border/80 bg-background/45 px-1.5 text-[0.65rem] text-muted-foreground"
                translate="no"
              >
                <span className="truncate">{roleShiftLabel}</span>
              </Badge>
              {shiftTimeLabel ? (
                <span
                  className="text-[0.6rem] font-medium text-muted-foreground/70"
                  translate="no"
                >
                  {shiftTimeLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 pt-0.5">
            <TrackerStatusBadge status={card.displayStatus} prominent />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col gap-2.5 p-3 pt-0">
        <section
          aria-label="Monthly Records"
          className="flex flex-wrap gap-1.5"
          data-slot="tracker-card-records"
        >
          <RecordBadge
            color="var(--status-cuti)"
            label="Cuti"
            value={`${card.cutiStock}x`}
          />
        </section>
      </CardContent>

      <CardFooter className="relative z-10 flex flex-col items-stretch gap-2 border-t border-border/70 bg-background/25 p-3">
        <div aria-label="Tracker action footer" data-slot="tracker-card-actions">
          <TrackerControlZone
            card={card}
            canApplyTrackerActions={canApplyTrackerActions}
          />
        </div>
      </CardFooter>
    </Card>
  );
}

function RecordBadge({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span
      className="tracker-record-badge"
      style={{ "--record-color": color } as React.CSSProperties}
    >
      <span className="text-muted-foreground/60">{label}</span>
      <span className="font-mono font-bold" style={{ color }}>
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

function getShiftTimeLabel(card: TrackerCardDTO): string | null {
  const shift = getShiftDefinition(card.shift);

  if (shift.isFlexible || shift.startHour === null || shift.endHour === null) {
    return null;
  }

  const start = `${String(shift.startHour).padStart(2, "0")}:${String(shift.startMinute ?? 0).padStart(2, "0")}`;
  const end = `${String(shift.endHour).padStart(2, "0")}:${String(shift.endMinute ?? 0).padStart(2, "0")}`;

  return `${start}\u2013${end}`;
}
