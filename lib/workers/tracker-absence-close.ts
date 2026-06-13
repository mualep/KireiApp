import type { StaffTier } from "@/lib/auth/tiers";
import type { WorkerStoredStatus } from "@/lib/workers/types";

const WIB_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;

export const trackerExpiredAbsenceCloseActions = [
  "CLOSE_EXPIRED_ABSENCE",
] as const;

export type TrackerExpiredAbsenceCloseAction =
  (typeof trackerExpiredAbsenceCloseActions)[number];

export const trackerExpiredAbsenceCloseStatuses = [
  "cuti",
  "sakit",
  "pending",
] as const satisfies readonly WorkerStoredStatus[];

export type TrackerCorrectionWindowState = "expired" | "open" | "unavailable";

export type TrackerExpiredAbsenceCloseTransitionResult =
  | {
      ok: true;
      targetStatus: "off";
    }
  | {
      ok: false;
      reason: "invalid_source_status" | "member_read_only" | "not_expired";
    };

export function isTrackerExpiredAbsenceCloseAction(
  value: unknown,
): value is TrackerExpiredAbsenceCloseAction {
  return (
    typeof value === "string" &&
    trackerExpiredAbsenceCloseActions.includes(
      value as TrackerExpiredAbsenceCloseAction,
    )
  );
}

export function isTrackerExpiredAbsenceCloseStatus(
  value: WorkerStoredStatus,
): value is (typeof trackerExpiredAbsenceCloseStatuses)[number] {
  return trackerExpiredAbsenceCloseStatuses.includes(
    value as (typeof trackerExpiredAbsenceCloseStatuses)[number],
  );
}

export function canStaffTierCloseExpiredTrackerAbsence(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin";
}

export function evaluateTrackerExpiredAbsenceCloseTransition({
  action,
  actorTier,
  isExpired,
  storedStatus,
}: {
  action: TrackerExpiredAbsenceCloseAction;
  actorTier: StaffTier;
  isExpired: boolean;
  storedStatus: WorkerStoredStatus;
}): TrackerExpiredAbsenceCloseTransitionResult {
  if (!canStaffTierCloseExpiredTrackerAbsence(actorTier)) {
    return { ok: false, reason: "member_read_only" };
  }

  if (!isTrackerExpiredAbsenceCloseAction(action)) {
    return { ok: false, reason: "invalid_source_status" };
  }

  if (!isTrackerExpiredAbsenceCloseStatus(storedStatus)) {
    return { ok: false, reason: "invalid_source_status" };
  }

  if (!isExpired) {
    return { ok: false, reason: "not_expired" };
  }

  return { ok: true, targetStatus: "off" };
}

export function getTrackerCorrectionWindowState({
  attendanceDate,
  isFlexible,
  now,
  shiftEndHour,
  shiftEndMinute,
  shiftStartHour,
  shiftStartMinute,
}: {
  attendanceDate: string | null;
  isFlexible: boolean;
  now: Date;
  shiftEndHour: number | null;
  shiftEndMinute: number | null;
  shiftStartHour: number | null;
  shiftStartMinute: number | null;
}): TrackerCorrectionWindowState {
  if (!attendanceDate || !isIsoDate(attendanceDate)) {
    return "unavailable";
  }

  if (isFlexible) {
    return getCurrentWibDate(now) === attendanceDate ? "open" : "expired";
  }

  if (
    shiftStartHour === null ||
    shiftStartMinute === null ||
    shiftEndHour === null ||
    shiftEndMinute === null
  ) {
    return "unavailable";
  }

  const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;
  const shiftEndMinutes = shiftEndHour * 60 + shiftEndMinute;
  const endDayOffset = shiftEndMinutes <= shiftStartMinutes ? 1 : 0;
  const shiftEndsAt = toUtcTimestampFromWibDateTime(
    attendanceDate,
    shiftEndHour,
    shiftEndMinute,
    endDayOffset,
  );

  return now.getTime() < shiftEndsAt ? "open" : "expired";
}

function getCurrentWibDate(now: Date): string {
  const wibDate = new Date(now.getTime() + WIB_OFFSET_MILLISECONDS);

  return [
    wibDate.getUTCFullYear(),
    String(wibDate.getUTCMonth() + 1).padStart(2, "0"),
    String(wibDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function toUtcTimestampFromWibDateTime(
  date: string,
  hour: number,
  minute: number,
  dayOffset = 0,
): number {
  const [year, month, day] = date.split("-").map(Number);

  return (
    Date.UTC(year, month - 1, day + dayOffset, hour, minute, 0, 0) -
    WIB_OFFSET_MILLISECONDS
  );
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
