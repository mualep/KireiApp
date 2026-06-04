import type { WorkerAttendanceStatus } from "@/lib/workers/attendance-records";

export const absensiAttendanceLabels = {
  alpha: "ALPHA",
  cuti: "CUTI",
  hadir: "HADIR",
  pending: "PENDING",
  sakit: "SAKIT",
} as const satisfies Record<WorkerAttendanceStatus, string>;

export type AbsensiAttendanceStatus = keyof typeof absensiAttendanceLabels;

export type AbsensiMonthRange = {
  days: string[];
  monthLabel: string;
  monthParam: string;
  monthStart: string;
  nextMonthParam: string;
  nextMonthStart: string;
  previousMonthParam: string;
};

const monthParamPattern = /^(\d{4})-(\d{2})$/;
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
  year: "numeric",
});
const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export function getAbsensiMonthRange(value?: string): AbsensiMonthRange {
  const monthParam = parseMonthParam(value) ?? getCurrentWibMonthParam();
  const [year, month] = monthParam.split("-").map(Number);
  const monthStartDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const days: string[] = [];

  for (
    const day = new Date(monthStartDate);
    day < nextMonthDate;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    days.push(formatDateParam(day));
  }

  return {
    days,
    monthLabel: monthLabelFormatter.format(monthStartDate),
    monthParam,
    monthStart: formatDateParam(monthStartDate),
    nextMonthParam: formatMonthParam(nextMonthDate),
    nextMonthStart: formatDateParam(nextMonthDate),
    previousMonthParam: formatMonthParam(previousMonthDate),
  };
}

export function isAbsensiAttendanceStatus(
  value: string,
): value is AbsensiAttendanceStatus {
  return value in absensiAttendanceLabels;
}

export function getAbsensiDayNumber(date: string): string {
  return String(Number(date.slice(-2)));
}

function parseMonthParam(value: string | undefined): string | null {
  const match = monthParamPattern.exec(value ?? "");

  if (!match) {
    return null;
  }

  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return `${match[1]}-${match[2]}`;
}

function getCurrentWibMonthParam(): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(new Date());
}

function formatDateParam(date: Date): string {
  return dateFormatter.format(date);
}

function formatMonthParam(date: Date): string {
  return formatDateParam(date).slice(0, 7);
}
