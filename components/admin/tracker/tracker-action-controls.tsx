"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import {
  HourglassIcon,
  PauseCircleIcon,
  PlayIcon,
  RefreshCwIcon,
  SquareIcon,
  TimerIcon,
  TrendingUpIcon,
  UserPlusIcon,
} from "lucide-react";

import {
  applyTrackerAction,
  applyTrackerCorrection,
  applyTrackerExpiredAbsenceClose,
  materializeTrackerAbsenceDays,
  type ApplyTrackerActionResult,
  type ApplyTrackerAbsenceMaterializationResult,
  type ApplyTrackerCorrectionResult,
  type ApplyTrackerExpiredAbsenceCloseResult,
} from "@/app/admin/(shell)/tracker/actions";
import { Button } from "@/components/ui/button";
import {
  formatBreakRemainingSeconds,
  getBreakRemainingSeconds,
} from "@/lib/tracker/break-timer";
import { cn } from "@/lib/utils";
import { type TrackerAction, isLemburAvailable } from "@/lib/workers/tracker-actions";
import type { TrackerAbsenceMaterializationAction } from "@/lib/workers/tracker-absence-materialization";
import type { TrackerExpiredAbsenceCloseAction } from "@/lib/workers/tracker-absence-close";
import type { TrackerCorrectionAction } from "@/lib/workers/tracker-corrections";
import type { TrackerCardDTO } from "@/lib/workers";

const BREAK_WARNING_THRESHOLD_SECONDS = 600;

function getBreakTimerColorClass(remainingSeconds: number): string {
  if (remainingSeconds < 0) {
    return "tracker-timer-overdue";
  }

  if (remainingSeconds <= BREAK_WARNING_THRESHOLD_SECONDS) {
    return "tracker-timer-warning";
  }

  return "tracker-timer-normal";
}

type TrackerActionControlsProps = {
  card: TrackerCardDTO;
};

type ControlTone =
  | "break"
  | "cuti"
  | "danger"
  | "muted"
  | "on"
  | "pending"
  | "sakit"
  | "lembur";

type ActionControlConfig = {
  action: TrackerAction;
  className?: string;
  icon: React.ReactNode;
  label: string;
  tone: ControlTone;
};

type CorrectionControlConfig = {
  className?: string;
  correctionAction: TrackerCorrectionAction;
  icon: React.ReactNode;
  label: string;
  tone: ControlTone;
};

type ExpiredAbsenceCloseControlConfig = {
  className?: string;
  expiredAbsenceCloseAction: TrackerExpiredAbsenceCloseAction;
  icon: React.ReactNode;
  label: string;
  tone: ControlTone;
};

type AbsenceMaterializationControlConfig = {
  absenceMaterializationAction: TrackerAbsenceMaterializationAction;
  className?: string;
  icon: React.ReactNode;
  label: string;
  tone: ControlTone;
};

type TrackerControlConfig =
  | ActionControlConfig
  | CorrectionControlConfig
  | ExpiredAbsenceCloseControlConfig
  | AbsenceMaterializationControlConfig;

const genericFailure: ApplyTrackerActionResult = {
  code: "generic_error",
  message: "We could not apply that tracker action. Please try again.",
  ok: false,
};

export function TrackerActionControls({ card }: TrackerActionControlsProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<TrackerAction | null>(
    null,
  );
  const [pendingCorrectionAction, setPendingCorrectionAction] =
    useState<TrackerCorrectionAction | null>(null);
  const [pendingExpiredAbsenceCloseAction, setPendingExpiredAbsenceCloseAction] =
    useState<TrackerExpiredAbsenceCloseAction | null>(null);
  const [
    pendingAbsenceMaterializationAction,
    setPendingAbsenceMaterializationAction,
  ] = useState<TrackerAbsenceMaterializationAction | null>(null);
  const [selectedCorrectionAction, setSelectedCorrectionAction] =
    useState<TrackerCorrectionAction | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionReasonError, setCorrectionReasonError] = useState<string | null>(
    null,
  );
  const [result, setResult] = useState<
    | ApplyTrackerActionResult
    | ApplyTrackerAbsenceMaterializationResult
    | ApplyTrackerCorrectionResult
    | ApplyTrackerExpiredAbsenceCloseResult
    | null
  >(null);
  const controlGroups = getActiveControlGroups(card);
  const isPending =
    isTransitionPending ||
    pendingAction !== null ||
    pendingCorrectionAction !== null ||
    pendingExpiredAbsenceCloseAction !== null ||
    pendingAbsenceMaterializationAction !== null;
  const isBreakCard =
    card.storedStatus === "break" && card.displayStatus === "BREAK";
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!isBreakCard || !card.breakTimerRunning || !card.breakStartedAt) {
      return;
    }

    const initialTimer = window.setTimeout(() => {
      setNowMs(Date.now());
    }, 0);

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(initialTimer);
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

        if (
          nextResult.code === "success" ||
          nextResult.code === "version_conflict"
        ) {
          router.refresh();
        }
      } catch {
        setResult(genericFailure);
      } finally {
        setPendingAction(null);
      }
    });
  }

  function runTrackerCorrection(action: TrackerCorrectionAction) {
    if (isPending || !card.activeTrackerAttendanceId) {
      return;
    }

    setResult(null);
    setCorrectionReason("");
    setCorrectionReasonError(null);
    setSelectedCorrectionAction(action);
  }

  function submitTrackerCorrection() {
    if (isPending || !card.activeTrackerAttendanceId || !selectedCorrectionAction) {
      return;
    }

    const action = selectedCorrectionAction;
    const reason = correctionReason.trim();

    if (!reason) {
      setCorrectionReasonError("Reason is required before canceling tracker status.");
      return;
    }

    setResult(null);
    setCorrectionReasonError(null);
    setPendingCorrectionAction(action);

    startTransition(async () => {
      try {
        const nextResult = await applyTrackerCorrection({
          action,
          attendanceId: card.activeTrackerAttendanceId,
          expectedVersion: card.version,
          reason,
          targetUserId: card.userId,
        });

        setResult(nextResult);

        if (
          nextResult.code === "success" ||
          nextResult.code === "version_conflict"
        ) {
          router.refresh();
        }
      } catch {
        setResult(genericFailure);
      } finally {
        setPendingCorrectionAction(null);
        setSelectedCorrectionAction(null);
        setCorrectionReason("");
      }
    });
  }

  function runTrackerExpiredAbsenceClose(action: TrackerExpiredAbsenceCloseAction) {
    if (isPending) {
      return;
    }

    setResult(null);
    setPendingExpiredAbsenceCloseAction(action);

    startTransition(async () => {
      try {
        const nextResult = await applyTrackerExpiredAbsenceClose({
          action,
          attendanceId: card.activeTrackerAttendanceId ?? null,
          expectedVersion: card.version,
          targetUserId: card.userId,
        });

        setResult(nextResult);

        if (
          nextResult.code === "success" ||
          nextResult.code === "version_conflict"
        ) {
          router.refresh();
        }
      } catch {
        setResult(genericFailure);
      } finally {
        setPendingExpiredAbsenceCloseAction(null);
      }
    });
  }

  function runTrackerAbsenceMaterialization(
    action: TrackerAbsenceMaterializationAction,
  ) {
    if (isPending) {
      return;
    }

    setResult(null);
    setPendingAbsenceMaterializationAction(action);

    startTransition(async () => {
      try {
        const nextResult = await materializeTrackerAbsenceDays({
          action,
          expectedVersion: card.version,
          targetUserId: card.userId,
        });

        setResult(nextResult);

        if (
          nextResult.code === "success" ||
          nextResult.code === "version_conflict"
        ) {
          router.refresh();
        }
      } catch {
        setResult(genericFailure);
      } finally {
        setPendingAbsenceMaterializationAction(null);
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
    <div className="tracker-action-stack flex flex-col gap-2.5">
      {isBreakCard
        ? (() => {
            const remaining = getBreakRemainingSeconds({
              accumulatedSeconds: card.breakAccumulatedSecs,
              nowMs,
              startedAt: card.breakStartedAt,
              timerRunning: card.breakTimerRunning,
            });
            const timerColorClass = getBreakTimerColorClass(remaining);

            return (
              <div className="rounded-lg border border-status-break/25 bg-status-break/8 px-3 py-3.5 flex items-center justify-center gap-2.5">
                <TimerIcon
                  className={cn("size-6 shrink-0", timerColorClass)}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    "tracker-break-timer-large font-black",
                    timerColorClass,
                  )}
                >
                  {formatBreakRemainingSeconds(remaining)}
                </div>
              </div>
            );
          })()
        : null}

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
              key={
                "action" in control
                  ? control.action
                  : "correctionAction" in control
                    ? control.correctionAction
                    : "expiredAbsenceCloseAction" in control
                      ? control.expiredAbsenceCloseAction
                      : control.absenceMaterializationAction
              }
              type="button"
              aria-label={
                "absenceMaterializationAction" in control
                  ? `${control.label} ${card.absenceMaterializationMissingDays} hari`
                  : undefined
              }
              disabled={isPending}
              variant="outline"
              className={cn(
                "tracker-action-btn h-9 min-w-0 rounded-sm border px-3 text-sm font-bold",
                control.className,
              )}
              data-tone={control.tone}
              onClick={() =>
                "action" in control
                  ? runTrackerAction(control.action)
                  : "correctionAction" in control
                    ? runTrackerCorrection(control.correctionAction)
                    : "expiredAbsenceCloseAction" in control
                      ? runTrackerExpiredAbsenceClose(
                          control.expiredAbsenceCloseAction,
                        )
                      : runTrackerAbsenceMaterialization(
                          control.absenceMaterializationAction,
                        )
              }
            >
              {control.icon}
              <span className="truncate">
                {("action" in control && pendingAction === control.action) ||
                ("correctionAction" in control &&
                  pendingCorrectionAction === control.correctionAction) ||
                ("expiredAbsenceCloseAction" in control &&
                  pendingExpiredAbsenceCloseAction ===
                    control.expiredAbsenceCloseAction) ||
                ("absenceMaterializationAction" in control &&
                  pendingAbsenceMaterializationAction ===
                    control.absenceMaterializationAction)
                  ? "Working…"
                  : control.label}
              </span>
            </Button>
          ))}
        </div>
      ))}

      {selectedCorrectionAction ? (
        <div className="rounded-md border border-status-alpha/25 bg-status-alpha/8 p-2">
          <label className="flex flex-col gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Correction reason
            <textarea
              className="min-h-16 rounded-sm border border-border/80 bg-background/70 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-foreground outline-none transition focus-visible:border-status-alpha/70 focus-visible:ring-2 focus-visible:ring-status-alpha/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              maxLength={500}
              name="tracker-correction-reason"
              autoComplete="off"
              onChange={(event) => {
                setCorrectionReason(event.target.value);
                if (correctionReasonError) {
                  setCorrectionReasonError(null);
                }
              }}
              placeholder="Reason is required…"
              value={correctionReason}
            />
          </label>
          {correctionReasonError ? (
            <p className="mt-1.5 text-xs font-medium text-status-alpha" role="alert">
              {correctionReasonError}
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Button
              type="button"
              disabled={isPending}
              variant="outline"
              className="tracker-action-btn h-8 rounded-sm border px-2 text-xs font-bold"
              data-tone="danger"
              onClick={submitTrackerCorrection}
            >
              KONFIRMASI BATAL
            </Button>
            <Button
              type="button"
              disabled={isPending}
              variant="outline"
              className="tracker-action-btn h-8 rounded-sm border px-2 text-xs font-bold"
              data-tone="muted"
              onClick={() => {
                setSelectedCorrectionAction(null);
                setCorrectionReason("");
                setCorrectionReasonError(null);
              }}
            >
              CANCEL
            </Button>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}

function getActiveControlGroups(
  card: TrackerCardDTO,
): TrackerControlConfig[][] {
  if (
    card.storedStatus === "off" &&
    (card.displayStatus === "OFF" || card.displayStatus === "LATE")
  ) {
    return [
      [
        {
          action: "START",
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
        ...(isLemburAvailable(card)
          ? [
              {
                action: "LEMBUR" as const,
                icon: <TimerIcon data-icon="inline-start" aria-hidden="true" />,
                label: "LEMBUR",
                tone: "lembur" as const,
              },
            ]
          : []),
      ],
    ];
  }

  if (card.storedStatus === "lembur" && card.displayStatus === "LEMBUR") {
    return [
      [
        {
          action: "SELESAI",
          className: "tracker-action-btn-emphasis",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "FINISH",
          tone: "danger",
        },
        {
          action: "BATAL_LEMBUR",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "BATAL LEMBUR",
          tone: "muted",
        },
      ],
    ];
  }

  if (card.storedStatus === "on" && card.displayStatus === "ON") {
    return [
      [
        {
          action: "SELESAI",
          className: "tracker-action-btn-emphasis",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "FINISH",
          tone: "danger",
        },
        {
          action: "ISTIRAHAT",
          className: "tracker-action-btn-emphasis",
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

  if (
    card.activeTrackerAttendanceId &&
    card.storedStatus === "cuti" &&
    card.isTrackerCorrectionAvailable
  ) {
    return withAbsenceMaterializationGroup(card, [
      [
        {
          correctionAction: "CANCEL_CUTI",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "BATAL CUTI",
          tone: "danger",
        },
      ],
    ]);
  }

  if (
    card.storedStatus === "cuti" &&
    card.isExpiredAbsenceCloseAvailable
  ) {
    return withAbsenceMaterializationGroup(card, [
      [
        {
          expiredAbsenceCloseAction: "CLOSE_EXPIRED_ABSENCE",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "SELESAIKAN STATUS",
          tone: "danger",
        },
      ],
    ]);
  }

  if (
    card.activeTrackerAttendanceId &&
    card.storedStatus === "sakit" &&
    card.isTrackerCorrectionAvailable
  ) {
    return withAbsenceMaterializationGroup(card, [
      [
        {
          correctionAction: "CANCEL_SAKIT",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "BATAL SAKIT",
          tone: "danger",
        },
      ],
    ]);
  }

  if (
    card.storedStatus === "sakit" &&
    card.isExpiredAbsenceCloseAvailable
  ) {
    return withAbsenceMaterializationGroup(card, [
      [
        {
          expiredAbsenceCloseAction: "CLOSE_EXPIRED_ABSENCE",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "SELESAIKAN STATUS",
          tone: "danger",
        },
      ],
    ]);
  }

  if (
    card.activeTrackerAttendanceId &&
    card.storedStatus === "pending" &&
    card.isTrackerCorrectionAvailable
  ) {
    return withAbsenceMaterializationGroup(card, [
      [
        {
          correctionAction: "CANCEL_IZIN",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "BATAL PENDING",
          tone: "danger",
        },
      ],
    ]);
  }

  if (
    card.storedStatus === "pending" &&
    card.isExpiredAbsenceCloseAvailable
  ) {
    return withAbsenceMaterializationGroup(card, [
      [
        {
          expiredAbsenceCloseAction: "CLOSE_EXPIRED_ABSENCE",
          icon: <SquareIcon data-icon="inline-start" aria-hidden="true" />,
          label: "SELESAIKAN STATUS",
          tone: "danger",
        },
      ],
    ]);
  }

  return withAbsenceMaterializationGroup(card, []);
}

function withAbsenceMaterializationGroup(
  card: TrackerCardDTO,
  groups: TrackerControlConfig[][],
): TrackerControlConfig[][] {
  if (!card.isAbsenceMaterializationAvailable) {
    return groups;
  }

  return [
    [
      {
        absenceMaterializationAction: "MATERIALIZE_ABSENCE_DAYS",
        icon: <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />,
        label: "SINKRONKAN ABSENSI",
        tone: "pending",
      },
    ],
    ...groups,
  ];
}
