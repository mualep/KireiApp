import type React from "react";
import {
  IdCardIcon,
  HourglassIcon,
  PauseCircleIcon,
  PlayIcon,
  ShieldIcon,
  SquareIcon,
  StarIcon,
  TrendingUpIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";

import { TrackerStatusBadge } from "@/components/admin/tracker/tracker-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  TrackerCardDTO,
  WorkerDisplayStatus,
  WorkerRole,
} from "@/lib/workers";

type TrackerCardProps = {
  card: TrackerCardDTO;
  showActionPreview: boolean;
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

type ControlTone =
  | "break"
  | "cuti"
  | "danger"
  | "lembur"
  | "muted"
  | "on"
  | "pending"
  | "sakit";

type DisabledControlConfig = {
  className?: string;
  icon: React.ReactNode;
  label: string;
  tone: ControlTone;
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
  showActionPreview,
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

        <ReadOnlyControlZone
          card={card}
          showActionPreview={showActionPreview}
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

function ReadOnlyControlZone({
  card,
  showActionPreview,
}: {
  card: TrackerCardDTO;
  showActionPreview: boolean;
}) {
  if (!showActionPreview) {
    return (
      <div className="rounded-lg border border-border/75 bg-background/35 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        <ShieldIcon data-icon="inline-start" aria-hidden="true" />
        Self View
      </div>
    );
  }

  const controlGroups = getControlGroups(card);

  return (
    <div
      aria-label="Tracker controls preview, deferred until R2C"
      className="relative grid gap-1.5 rounded-lg border border-border/80 bg-background/30 p-1.5"
    >
      <span className="pointer-events-none absolute right-2 top-2 rounded border border-border bg-background/65 px-1.5 py-0.5 text-[0.58rem] font-bold text-muted-foreground">
        R2C
      </span>
      {controlGroups.map((group, index) => (
        <div
          key={index}
          className={cn(
            "grid gap-1.5",
            group.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {group.map((control) => (
            <DisabledControl key={control.label} {...control} />
          ))}
        </div>
      ))}
    </div>
  );
}

function DisabledControl({
  icon,
  label,
  tone,
  className,
}: DisabledControlConfig) {
  return (
    <Button
      type="button"
      disabled
      aria-disabled="true"
      variant="outline"
      className={cn(
        "h-8 min-w-0 rounded-md px-2 text-xs font-bold opacity-80",
        tone === "on" &&
          "border-status-on/35 bg-status-on/10 text-status-on shadow-sm shadow-status-on/15",
        tone === "break" &&
          "border-status-break/35 bg-status-break/10 text-status-break shadow-sm shadow-status-break/15",
        tone === "danger" &&
          "border-status-alpha/35 bg-status-alpha/10 text-status-alpha shadow-sm shadow-status-alpha/15",
        tone === "cuti" &&
          "border-status-cuti/35 bg-status-cuti/10 text-status-cuti shadow-sm shadow-status-cuti/15",
        tone === "sakit" &&
          "border-status-sakit/35 bg-status-sakit/10 text-status-sakit shadow-sm shadow-status-sakit/15",
        tone === "pending" &&
          "border-status-pending/35 bg-status-pending/10 text-status-pending shadow-sm shadow-status-pending/15",
        tone === "lembur" &&
          "border-status-lembur/35 bg-status-lembur/10 text-status-lembur shadow-sm shadow-status-lembur/15",
        tone === "muted" &&
          "border-border bg-muted/35 text-muted-foreground",
        className,
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  );
}

function getControlGroups(card: TrackerCardDTO): DisabledControlConfig[][] {
  switch (card.displayStatus) {
    case "ON":
      return [
        [
          finishControl(),
          {
            icon: <PauseCircleIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Break",
            tone: "break",
          },
        ],
      ];

    case "BREAK":
      return [
        [
          {
            icon: <PauseCircleIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Pause",
            tone: "break",
          },
          {
            icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Stop",
            tone: "danger",
          },
        ],
      ];

    case "CUTI":
      return [[cancelControl("Cancel Cuti", "cuti")]];

    case "SAKIT":
      return [[cancelControl("Cancel Sakit", "sakit")]];

    case "PENDING":
      return [[cancelControl("Cancel Pending", "pending")]];

    case "LEMBUR":
      return [[finishControl(), cancelControl("Cancel Lembur", "lembur")]];

    case "ALPHA":
    case "LATE":
    case "OFF":
      return [
        [
          {
            className: "pr-12",
            icon: <PlayIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Start",
            tone: "on",
          },
        ],
        [
          {
            icon: <TrendingUpIcon data-icon="inline-start" aria-hidden="true" />,
            label: `Cuti ${card.cutiStock}`,
            tone: card.cutiStock > 0 ? "cuti" : "muted",
          },
          {
            icon: <UserPlusIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Sakit",
            tone: "sakit",
          },
        ],
        [
          {
            icon: <HourglassIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Pending",
            tone: "pending",
          },
          {
            icon: <StarIcon data-icon="inline-start" aria-hidden="true" />,
            label: "Lembur",
            tone: "lembur",
          },
        ],
      ];
  }
}

function finishControl(): DisabledControlConfig {
  return {
    icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
    label: "Finish",
    tone: "danger",
  };
}

function cancelControl(
  label: string,
  tone: Extract<ControlTone, "cuti" | "lembur" | "pending" | "sakit">,
): DisabledControlConfig {
  return {
    className: "max-w-44 justify-self-start px-4",
    icon: <XIcon data-icon="inline-start" aria-hidden="true" />,
    label,
    tone,
  };
}

function getRoleShiftLabel(card: TrackerCardDTO): string {
  const role = compactRoleLabels[card.employeeRole];

  if (card.isFlexible) {
    return `${role} • Flexible`;
  }

  return `${role}-${card.shift}`;
}
