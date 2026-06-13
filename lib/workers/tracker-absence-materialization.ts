import type { StaffTier } from "@/lib/auth/tiers";
import type { WorkerStoredStatus } from "@/lib/workers/types";

export const trackerAbsenceMaterializationActions = [
  "MATERIALIZE_ABSENCE_DAYS",
] as const;

export type TrackerAbsenceMaterializationAction =
  (typeof trackerAbsenceMaterializationActions)[number];

export const trackerAbsenceMaterializationStatuses = [
  "cuti",
  "sakit",
  "pending",
] as const satisfies readonly WorkerStoredStatus[];

export function isTrackerAbsenceMaterializationAction(
  value: unknown,
): value is TrackerAbsenceMaterializationAction {
  return (
    typeof value === "string" &&
    trackerAbsenceMaterializationActions.includes(
      value as TrackerAbsenceMaterializationAction,
    )
  );
}

export function isTrackerAbsenceMaterializationStatus(
  value: WorkerStoredStatus,
): value is (typeof trackerAbsenceMaterializationStatuses)[number] {
  return trackerAbsenceMaterializationStatuses.includes(
    value as (typeof trackerAbsenceMaterializationStatuses)[number],
  );
}

export function canStaffTierMaterializeTrackerAbsence(tier: StaffTier): boolean {
  return tier === "owner" || tier === "admin";
}

export function getTrackerAbsenceMaterializationMissingDates({
  currentAttendanceDate,
  existingAttendanceDates,
  markerDate,
}: {
  currentAttendanceDate: string | null;
  existingAttendanceDates: ReadonlySet<string>;
  markerDate: string | null;
}): string[] {
  if (!markerDate || !currentAttendanceDate) {
    return [];
  }

  const start = parseIsoDate(markerDate);
  const end = parseIsoDate(currentAttendanceDate);

  if (!start || !end || start.getTime() > end.getTime()) {
    return [];
  }

  const missingDates: string[] = [];
  const cursor = new Date(start.getTime());

  while (cursor.getTime() <= end.getTime()) {
    const date = formatIsoDate(cursor);

    if (!existingAttendanceDates.has(date)) {
      missingDates.push(date);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return missingDates;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
