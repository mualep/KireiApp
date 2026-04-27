import {
  workerDisplayStatuses,
  workerRoles,
  workerShiftDefinitions,
  workerShifts,
  workerStatusDisplayLabels,
  workerStoredStatuses,
} from "@/lib/workers/constants";
import type {
  WorkerDisplayStatus,
  WorkerProfileInput,
  WorkerRole,
  WorkerShift,
  WorkerShiftDefinition,
  WorkerStoredStatus,
} from "@/lib/workers/types";

const WIB_OFFSET_MINUTES = 7 * 60;
const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_LATE_GRACE_MINUTES = 10;
const gidPattern = /^KRU-[0-9]{3}$/;

export function isWorkerRole(value: unknown): value is WorkerRole {
  return typeof value === "string" && workerRoles.includes(value as WorkerRole);
}

export function isWorkerShift(value: unknown): value is WorkerShift {
  return typeof value === "string" && workerShifts.includes(value as WorkerShift);
}

export function isWorkerStoredStatus(value: unknown): value is WorkerStoredStatus {
  return (
    typeof value === "string" &&
    workerStoredStatuses.includes(value as WorkerStoredStatus)
  );
}

export function isWorkerDisplayStatus(value: unknown): value is WorkerDisplayStatus {
  return (
    typeof value === "string" &&
    workerDisplayStatuses.includes(value as WorkerDisplayStatus)
  );
}

export function parseShiftTime(value: string): { hour: number; minute: number } | null {
  const match = /^([0-9]{2}):([0-9]{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!isValidHour(hour) || !isValidMinute(minute)) {
    return null;
  }

  return { hour, minute };
}

export function getShiftDefinition(shift: WorkerShift): WorkerShiftDefinition {
  return workerShiftDefinitions[shift];
}

export function validateWorkerProfileInput(input: WorkerProfileInput):
  | { ok: true; issues?: never }
  | { ok: false; issues: string[] } {
  const issues: string[] = [];

  if (!gidPattern.test(input.gid)) {
    issues.push("GID must use the KRU-001 format.");
  }

  if (!isWorkerRole(input.employeeRole)) {
    issues.push("Employee role is not allowed.");
  }

  if (!isWorkerShift(input.shift)) {
    issues.push("Worker shift is not allowed.");
  }

  const hasCompleteTimes = [
    input.shiftStartHour,
    input.shiftStartMinute,
    input.shiftEndHour,
    input.shiftEndMinute,
  ].every((value) => value !== null);
  const hasAnyTimes = [
    input.shiftStartHour,
    input.shiftStartMinute,
    input.shiftEndHour,
    input.shiftEndMinute,
  ].some((value) => value !== null);

  if (input.shift === "flexible" && !input.isFlexible) {
    issues.push("Flexible shift must use isFlexible=true.");
  }

  if (input.shift !== "flexible" && input.isFlexible) {
    issues.push("Only flexible shift can use isFlexible=true.");
  }

  if (input.isFlexible && hasAnyTimes) {
    issues.push("Flexible workers must not have fixed shift times.");
  }

  if (!input.isFlexible && !hasCompleteTimes) {
    issues.push("Fixed-shift workers must have complete shift times.");
  }

  for (const [label, value] of [
    ["shiftStartHour", input.shiftStartHour],
    ["shiftEndHour", input.shiftEndHour],
  ] as const) {
    if (value !== null && !isValidHour(value)) {
      issues.push(`${label} must be between 0 and 23.`);
    }
  }

  for (const [label, value] of [
    ["shiftStartMinute", input.shiftStartMinute],
    ["shiftEndMinute", input.shiftEndMinute],
  ] as const) {
    if (value !== null && !isValidMinute(value)) {
      issues.push(`${label} must be between 0 and 59.`);
    }
  }

  return issues.length > 0 ? { issues, ok: false } : { ok: true };
}

export function computeWorkerDisplayStatus({
  alphaDone,
  currentStatus,
  isFlexible,
  lateGraceMinutes = DEFAULT_LATE_GRACE_MINUTES,
  now,
  shift,
}: {
  alphaDone: boolean;
  currentStatus: WorkerStoredStatus;
  isFlexible: boolean;
  lateGraceMinutes?: number;
  now: Date;
  shift: WorkerShiftDefinition;
}): WorkerDisplayStatus {
  if (alphaDone) {
    return "ALPHA";
  }

  if (
    currentStatus === "off" &&
    !isFlexible &&
    !shift.isFlexible &&
    isInShiftAfterGrace(now, shift, lateGraceMinutes)
  ) {
    return "LATE";
  }

  return workerStatusDisplayLabels[currentStatus];
}

function isInShiftAfterGrace(
  now: Date,
  shift: WorkerShiftDefinition,
  graceMinutes: number,
): boolean {
  if (
    shift.startHour === null ||
    shift.startMinute === null ||
    shift.endHour === null ||
    shift.endMinute === null
  ) {
    return false;
  }

  const startMinutes = toMinutes(shift.startHour, shift.startMinute);
  const endMinutes = toMinutes(shift.endHour, shift.endMinute);
  const graceStartMinutes = (startMinutes + graceMinutes) % MINUTES_PER_DAY;
  const currentMinutes = getWibMinutesOfDay(now);

  if (startMinutes < endMinutes) {
    return currentMinutes >= graceStartMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= graceStartMinutes || currentMinutes < endMinutes;
}

function getWibMinutesOfDay(value: Date): number {
  const wibDate = new Date(value.getTime() + WIB_OFFSET_MINUTES * 60 * 1000);

  return toMinutes(wibDate.getUTCHours(), wibDate.getUTCMinutes());
}

function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function isValidHour(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 23;
}

function isValidMinute(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 59;
}

