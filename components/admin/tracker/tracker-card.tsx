import {
  Clock3Icon,
  IdCardIcon,
  ShieldIcon,
  TimerResetIcon,
  UserRoundIcon,
} from "lucide-react";

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
      <CardHeader className="relative z-10 p-3 pb-2">
        <div
          aria-label="Worker Identity"
          className="flex min-w-0 items-start justify-between gap-3"
          data-slot="tracker-card-identity"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--tracker-status-color)_22%,var(--border))] bg-background/50 text-[color-mix(in_oklch,var(--tracker-status-color)_78%,var(--foreground))] shadow-sm shadow-background/30">
              <UserRoundIcon aria-hidden="true" />
            </span>
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
                <Badge
                  variant="outline"
                  className="h-5 max-w-[7rem] border-border/70 bg-background/35 px-1.5 font-mono text-[0.65rem] text-muted-foreground"
                  translate="no"
                >
                  <IdCardIcon data-icon="inline-start" aria-hidden="true" />
                  <span className="truncate">{card.gid}</span>
                </Badge>
              </div>
            </div>
          </div>
          <div className="shrink-0 pt-0.5">
            <TrackerStatusBadge status={card.displayStatus} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col gap-2.5 p-3 pt-0">
        <section
          aria-label="Worker Metadata"
          className="grid grid-cols-2 gap-1.5"
          data-slot="tracker-card-metadata"
        >
          <MetricChip label="Role" tone="muted" value={roleShiftLabel} />
          <MetricChip label="Cuti" tone="cuti" value={`${card.cutiStock}x`} />
          <MetricChip
            label="Stored"
            tone="status"
            value={card.storedStatus.toUpperCase()}
          />
          <MetricChip label="Version" tone="muted" value={`v${card.version}`} />
        </section>

        <section
          aria-label="Worker Activity"
          className="rounded-lg border border-border/70 bg-background/30 p-2"
          data-slot="tracker-card-activity"
        >
          <div className="grid gap-1.5 text-[0.68rem] sm:grid-cols-2">
            <ActivityDetail
              icon={<Clock3Icon data-icon="inline-start" aria-hidden="true" />}
              label="Updated"
              translateValue={false}
              value={updatedAtText}
            />
            <ActivityDetail
              icon={<TimerResetIcon data-icon="inline-start" aria-hidden="true" />}
              label="Break Used"
              value={formatDuration(card.breakAccumulatedSecs)}
            />
          </div>
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
        "inline-flex h-6 min-w-0 max-w-full items-center justify-between gap-1 rounded-md border px-1.5 text-[0.65rem] text-muted-foreground",
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

function ActivityDetail({
  icon,
  label,
  translateValue = true,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  translateValue?: boolean;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-muted-foreground">
      <span className="inline-flex min-w-0 items-center gap-1">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        className="truncate text-right font-mono font-bold text-foreground"
        translate={translateValue ? "no" : undefined}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
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
