import type { StaffTier } from "@/lib/auth/tiers";
import type { WorkerAttendanceStatus } from "@/lib/workers/attendance-records";
import type {
  WorkerDisplayStatus,
  WorkerShiftDefinition,
  WorkerStoredStatus,
  TrackerCardDTO,
} from "@/lib/workers/types";
import { getShiftDefinition } from "@/lib/workers/helpers";
import { getOperationalDate } from "@/lib/utils";

const WIB_OFFSET_MINUTES = 7 * 60;
const WIB_OFFSET_MILLISECONDS = WIB_OFFSET_MINUTES * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_LATE_GRACE_MINUTES = 10;

export const trackerActions = [
  "START",
  "ISTIRAHAT",
  "LANJUT",
  "SELESAI",
  "CUTI",
  "IZIN",
  "SAKIT",
  "LEMBUR",
  "BATAL_LEMBUR",
] as const;

export type TrackerAction = (typeof trackerActions)[number];

export const trackerActionTargetStatuses = {
  CUTI: "cuti",
  ISTIRAHAT: "break",
  IZIN: "pending",
  LANJUT: "on",
  SAKIT: "sakit",
  SELESAI: "off",
  START: "on",
  LEMBUR: "lembur",
  BATAL_LEMBUR: "off",
} as const satisfies Record<TrackerAction, WorkerStoredStatus>;

export const trackerActionAttendanceStatuses = {
  CUTI: "cuti",
  ISTIRAHAT: null,
  IZIN: "pending",
  LANJUT: null,
  SAKIT: "sakit",
  SELESAI: null,
  START: "hadir",
  LEMBUR: null,
  BATAL_LEMBUR: null,
} as const satisfies Record<TrackerAction, WorkerAttendanceStatus | null>;

export type TrackerActionTransitionRejectReason =
  | "alpha_rejected"
  | "invalid_source_status"
  | "member_read_only";

export type TrackerActionTransitionResult =
  | {
      attendanceStatus: (typeof trackerActionAttendanceStatuses)[TrackerAction];
      ok: true;
      targetStatus: (typeof trackerActionTargetStatuses)[TrackerAction];
    }
  | {
      ok: false;
      reason: TrackerActionTransitionRejectReason;
    };

export function isTrackerAction(value: unknown): value is TrackerAction {
  return typeof value === "string" && trackerActions.includes(value as TrackerAction);
}

export function canStaffTierPerformTrackerAction(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin";
}

export function evaluateTrackerActionTransition({
  action,
  actorTier,
  displayStatus,
  storedStatus,
}: {
  action: TrackerAction;
  actorTier: StaffTier;
  displayStatus: WorkerDisplayStatus;
  storedStatus: WorkerStoredStatus;
}): TrackerActionTransitionResult {
  if (!canStaffTierPerformTrackerAction(actorTier)) {
    return { ok: false, reason: "member_read_only" };
  }

  if (displayStatus === "ALPHA") {
    return { ok: false, reason: "alpha_rejected" };
  }

  if (!isAllowedTransitionSource(action, storedStatus, displayStatus)) {
    return { ok: false, reason: "invalid_source_status" };
  }

  return {
    attendanceStatus: trackerActionAttendanceStatuses[action],
    ok: true,
    targetStatus: trackerActionTargetStatuses[action],
  };
}

export function deriveTrackerAttendanceDate({
  now,
  shift,
}: {
  now: Date;
  shift: WorkerShiftDefinition;
}): string {
  return getOperationalDate(now);
}

export function computeTrackerWorkLateSeconds({
  lateGraceMinutes = DEFAULT_LATE_GRACE_MINUTES,
  now,
  shift,
}: {
  lateGraceMinutes?: number;
  now: Date;
  shift: WorkerShiftDefinition;
}): number {
  const timing = getFixedShiftTiming(now, shift);

  if (!timing) {
    return 0;
  }

  const graceStartsAt = timing.startsAt + lateGraceMinutes * 60 * 1000;
  const nowMs = now.getTime();

  if (nowMs < graceStartsAt || nowMs >= timing.endsAt) {
    return 0;
  }

  return Math.floor((nowMs - graceStartsAt) / 1000);
}

function isAllowedTransitionSource(
  action: TrackerAction,
  storedStatus: WorkerStoredStatus,
  displayStatus: WorkerDisplayStatus,
): boolean {
  switch (action) {
    case "CUTI":
    case "IZIN":
    case "SAKIT":
    case "START":
      return storedStatus === "off" && (displayStatus === "OFF" || displayStatus === "LATE");
    case "LEMBUR":
      return storedStatus === "off" && displayStatus === "OFF";
    case "BATAL_LEMBUR":
      return storedStatus === "lembur";
    case "ISTIRAHAT":
      return storedStatus === "on";
    case "SELESAI":
      return storedStatus === "on" || storedStatus === "lembur";
    case "LANJUT":
      return storedStatus === "break";
  }
}

function getFixedShiftTiming(
  now: Date,
  shift: WorkerShiftDefinition,
): { endsAt: number; startsAt: number } | null {
  if (
    shift.isFlexible ||
    shift.startHour === null ||
    shift.startMinute === null ||
    shift.endHour === null ||
    shift.endMinute === null
  ) {
    return null;
  }

  const attendanceDate = deriveTrackerAttendanceDate({ now, shift });
  const startMinutes = toMinutes(shift.startHour, shift.startMinute);
  const endMinutes = toMinutes(shift.endHour, shift.endMinute);
  const endDayOffset = endMinutes <= startMinutes ? 1 : 0;

  return {
    endsAt: toUtcTimestampFromWibDateTime(
      attendanceDate,
      shift.endHour,
      shift.endMinute,
      endDayOffset,
    ),
    startsAt: toUtcTimestampFromWibDateTime(
      attendanceDate,
      shift.startHour,
      shift.startMinute,
    ),
  };
}

function getWibParts(value: Date): {
  day: number;
  minutesOfDay: number;
  month: number;
  year: number;
} {
  const wibDate = new Date(value.getTime() + WIB_OFFSET_MILLISECONDS);

  return {
    day: wibDate.getUTCDate(),
    minutesOfDay: toMinutes(wibDate.getUTCHours(), wibDate.getUTCMinutes()),
    month: wibDate.getUTCMonth() + 1,
    year: wibDate.getUTCFullYear(),
  };
}

function toUtcTimestampFromWibDateTime(
  isoDate: string,
  hour: number,
  minute: number,
  dayOffset = 0,
): number {
  const [year, month, day] = parseIsoDate(isoDate);

  return Date.UTC(year, month - 1, day + dayOffset, hour, minute) - WIB_OFFSET_MILLISECONDS;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = parseIsoDate(isoDate);
  const value = new Date(Date.UTC(year, month - 1, day + days));

  return formatDateParts(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
  );
}

function parseIsoDate(isoDate: string): [number, number, number] {
  const [year, month, day] = isoDate.split("-").map(Number);

  return [year, month, day];
}

function formatDateParts(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function toMinutes(hour: number, minute: number): number {
  return (hour * 60 + minute) % MINUTES_PER_DAY;
}

export function isLemburAvailable(card: TrackerCardDTO, now: Date = new Date()): boolean {
  if (card.storedStatus !== "off" || card.displayStatus !== "OFF") {
    return false;
  }
  if (card.isFlexible) {
    return true;
  }
  const definition = getShiftDefinition(card.shift);
  const timing = getFixedShiftTiming(now, definition);
  if (!timing) {
    return false;
  }
  return now.getTime() >= timing.endsAt;
}
