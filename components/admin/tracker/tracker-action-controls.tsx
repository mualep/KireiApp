"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import {
  HourglassIcon,
  PauseCircleIcon,
  PlayIcon,
  SquareIcon,
  TimerIcon,
  TrendingUpIcon,
  UserPlusIcon,
} from "lucide-react";

import {
  applyTrackerAction,
  type ApplyTrackerActionResult,
} from "@/app/admin/(shell)/tracker/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrackerAction } from "@/lib/workers/tracker-actions";
import type { TrackerCardDTO } from "@/lib/workers";

type TrackerActionControlsProps = {
  card: TrackerCardDTO;
};

type ControlTone = "break" | "cuti" | "danger" | "muted" | "on" | "pending" | "sakit";

type ActionControlConfig = {
  action: TrackerAction;
  className?: string;
  icon: React.ReactNode;
  label: string;
  tone: ControlTone;
};

const genericFailure: ApplyTrackerActionResult = {
  code: "generic_error",
  message: "We could not apply that tracker action. Please try again.",
  ok: false,
};

export function TrackerActionControls({ card }: TrackerActionControlsProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<TrackerAction | null>(null);
  const [result, setResult] = useState<ApplyTrackerActionResult | null>(null);
  const controlGroups = getActiveControlGroups(card);
  const isPending = isTransitionPending || pendingAction !== null;
  const isBreakCard = card.storedStatus === "break" && card.displayStatus === "BREAK";
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!isBreakCard || !card.breakTimerRunning || !card.breakStartedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [card.breakStartedAt, card.breakTimerRunning, isBreakCard]);

  function runTrackerAction(action: TrackerAction) {
    if (isPending) {
      return;
    }

    setResult(null);
    setPendingAction(action);

    startTransition(async () => {
      try {
        const nextResult = await applyTrackerAction({
          action,
          expectedVersion: card.version,
          targetUserId: card.userId,
        });

        setResult(nextResult);

        if (nextResult.code === "success" || nextResult.code === "version_conflict") {
          router.refresh();
        }
      } catch {
        setResult(genericFailure);
      } finally {
        setPendingAction(null);
      }
    });
  }

  if (controlGroups.length === 0) {
    return (
      <div className="rounded-md border border-border/75 bg-background/35 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        No Actions
      </div>
    );
  }

  return (
    <>
      {isBreakCard ? (
        <div className="rounded-md border border-status-break/25 bg-status-break/10 px-2 py-1.5 text-xs">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1 font-medium text-muted-foreground">
              <TimerIcon data-icon="inline-start" aria-hidden="true" />
              <span className="truncate">Break Timer</span>
            </span>
            <span className="shrink-0 font-mono font-black text-status-break">
              {formatBreakDuration(getBreakDurationSeconds(card, nowMs))}
            </span>
          </div>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            Ends break and returns to active work.
          </p>
        </div>
      ) : null}

      {controlGroups.map((group, index) => (
        <div
          key={index}
          className={cn(
            "grid gap-1.5",
            group.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {group.map((control) => (
            <Button
              key={control.action}
              type="button"
              disabled={isPending}
              variant="outline"
              className={cn(
                "h-8 min-w-0 rounded-md px-2 text-xs font-bold",
                control.tone === "on" &&
                  "border-status-on/35 bg-status-on/10 text-status-on shadow-sm shadow-status-on/15",
                control.tone === "break" &&
                  "border-status-break/35 bg-status-break/10 text-status-break shadow-sm shadow-status-break/15",
                control.tone === "danger" &&
                  "border-status-alpha/35 bg-status-alpha/10 text-status-alpha shadow-sm shadow-status-alpha/15",
                control.tone === "cuti" &&
                  "border-status-cuti/35 bg-status-cuti/10 text-status-cuti shadow-sm shadow-status-cuti/15",
                control.tone === "sakit" &&
                  "border-status-sakit/35 bg-status-sakit/10 text-status-sakit shadow-sm shadow-status-sakit/15",
                control.tone === "pending" &&
                  "border-status-pending/35 bg-status-pending/10 text-status-pending shadow-sm shadow-status-pending/15",
                control.tone === "muted" &&
                  "border-border bg-muted/35 text-muted-foreground",
                control.className,
              )}
              onClick={() => runTrackerAction(control.action)}
            >
              {control.icon}
              <span className="truncate">
                {pendingAction === control.action ? "Working…" : control.label}
              </span>
            </Button>
          ))}
        </div>
      ))}

      {result ? (
        <p
          aria-live="polite"
          className={cn(
            "rounded-md border px-2 py-1.5 text-xs font-medium",
            result.ok
              ? "border-status-on/25 bg-status-on/10 text-status-on"
              : "border-status-alpha/25 bg-status-alpha/10 text-status-alpha",
          )}
          role="status"
        >
          {result.message}
        </p>
      ) : null}
    </>
  );
}

function getActiveControlGroups(card: TrackerCardDTO): ActionControlConfig[][] {
  if (
    card.storedStatus === "off" &&
    (card.displayStatus === "OFF" || card.displayStatus === "LATE")
  ) {
    return [
      [
        {
          action: "START",
          className: "pr-12",
          icon: <PlayIcon data-icon="inline-start" aria-hidden="true" />,
          label: "START",
          tone: "on",
        },
      ],
      [
        {
          action: "CUTI",
          icon: <TrendingUpIcon data-icon="inline-start" aria-hidden="true" />,
          label: `CUTI ${card.cutiStock}`,
          tone: card.cutiStock > 0 ? "cuti" : "muted",
        },
        {
          action: "SAKIT",
          icon: <UserPlusIcon data-icon="inline-start" aria-hidden="true" />,
          label: "SAKIT",
          tone: "sakit",
        },
      ],
      [
        {
          action: "IZIN",
          icon: <HourglassIcon data-icon="inline-start" aria-hidden="true" />,
          label: "PENDING",
          tone: "pending",
        },
      ],
    ];
  }

  if (card.storedStatus === "on" && card.displayStatus === "ON") {
    return [
      [
        {
          action: "SELESAI",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "FINISH",
          tone: "danger",
        },
        {
          action: "ISTIRAHAT",
          icon: <PauseCircleIcon data-icon="inline-start" aria-hidden="true" />,
          label: "BREAK",
          tone: "break",
        },
      ],
    ];
  }

  if (card.storedStatus === "break" && card.displayStatus === "BREAK") {
    return [
      [
        {
          action: "LANJUT",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "STOP ISTIRAHAT",
          tone: "danger",
        },
      ],
    ];
  }

  return [];
}

function getBreakDurationSeconds(card: TrackerCardDTO, nowMs: number | null): number {
  if (!card.breakTimerRunning || !card.breakStartedAt || nowMs === null) {
    return card.breakAccumulatedSecs;
  }

  const startedAtMs = new Date(card.breakStartedAt).getTime();

  if (!Number.isFinite(startedAtMs)) {
    return card.breakAccumulatedSecs;
  }

  const liveSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));

  return card.breakAccumulatedSecs + liveSeconds;
}

function formatBreakDuration(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
