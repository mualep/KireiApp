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
  const roleShiftLabel = getFullRoleShiftLabel(card);
  const compactRoleShiftLabel = getCompactRoleShiftLabel(card);
  const shiftTimeLabel = getShiftTimeLabel(card);

  return (
    <Card
      size="sm"
      className={cn(
        "tracker-worker-card tracker-glass-panel tracker-card-tone relative gap-0 overflow-hidden rounded-xl border py-0",
        cardToneClasses[card.displayStatus],
      )}
    >
      <CardHeader className="relative z-10 px-4 pt-3 pb-2">
        <div
          aria-label="Worker Identity"
          className="flex min-w-0 items-start justify-between gap-3"
          data-slot="tracker-card-identity"
        >
          <div className="min-w-0">
            <CardTitle
              className="truncate text-lg font-black leading-tight text-foreground"
              translate="no"
            >
              {card.name}
            </CardTitle>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="h-5 max-w-[12rem] border-border/80 bg-background/45 px-1.5 text-[0.65rem] text-muted-foreground"
                translate="no"
              >
                <span className="hidden truncate @[14rem]:inline">{roleShiftLabel}</span>
                <span className="truncate @[14rem]:hidden">{compactRoleShiftLabel}</span>
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

      <CardContent className="relative z-10 flex flex-col gap-2.5 px-4 pt-0 pb-3">
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

      {canApplyTrackerActions ? (
        <CardFooter className="relative z-10 flex flex-col items-stretch gap-1.5 border-t border-border/70 bg-background/25 px-4 py-3">
          <div aria-label="Tracker action footer" data-slot="tracker-card-actions">
            <TrackerControlZone
              card={card}
              canApplyTrackerActions={canApplyTrackerActions}
            />
          </div>
          <div className="flex justify-end">
            <span className="select-none text-[0.55rem] font-bold tracking-widest text-muted-foreground/30">
              R2C
            </span>
          </div>
        </CardFooter>
      ) : null}
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
    return null;
  }

  return <TrackerActionControls card={card} />;
}

function getFullRoleShiftLabel(card: TrackerCardDTO): string {
  const role = card.employeeRole;

  if (card.isFlexible) {
    return `${role} • Flexible`;
  }

  return `${role}-${card.shift}`;
}

function getCompactRoleShiftLabel(card: TrackerCardDTO): string {
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
