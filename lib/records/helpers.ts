export type RecordsMonthRange = {
  monthLabel: string;
  monthParam: string;
  monthStart: string;
  nextMonthParam: string;
  previousMonthParam: string;
};

export type EffectiveRecordMetric<T extends number | null = number> = {
  isOverride: boolean;
  value: T;
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

export function getRecordsMonthRange(value?: string): RecordsMonthRange {
  const monthParam = parseMonthParam(value) ?? getCurrentWibMonthParam();
  const [year, month] = monthParam.split("-").map(Number);
  const monthStartDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));

  return {
    monthLabel: monthLabelFormatter.format(monthStartDate),
    monthParam,
    monthStart: formatDateParam(monthStartDate),
    nextMonthParam: formatMonthParam(nextMonthDate),
    previousMonthParam: formatMonthParam(previousMonthDate),
  };
}

export function getEffectiveRecordMetric(
  value: number,
  overrideValue: number | null,
): EffectiveRecordMetric;
export function getEffectiveRecordMetric(
  value: number | null,
  overrideValue: number | null,
): EffectiveRecordMetric<number | null>;
export function getEffectiveRecordMetric(
  value: number | null,
  overrideValue: number | null,
): EffectiveRecordMetric<number | null> {
  return {
    isOverride: overrideValue !== null,
    value: overrideValue ?? value,
  };
}

export function formatRecordsDuration(seconds: number): string {
  if (seconds <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatRecordsNumber(value: number | null): string {
  return value === null ? "-" : String(value);
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
