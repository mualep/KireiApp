export const TRACKER_BREAK_LIMIT_SECONDS = 60 * 60;

export type BreakTimerSnapshot = {
  accumulatedSeconds: number;
  nowMs: number | null;
  startedAt: string | null;
  timerRunning: boolean;
};

export function getBreakElapsedSeconds({
  accumulatedSeconds,
  nowMs,
  startedAt,
  timerRunning,
}: BreakTimerSnapshot): number {
  const accumulated = normalizeElapsedSeconds(accumulatedSeconds);

  if (!timerRunning || !startedAt || nowMs === null) {
    return accumulated;
  }

  const startedAtMs = new Date(startedAt).getTime();

  if (!Number.isFinite(startedAtMs)) {
    return accumulated;
  }

  const liveSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));

  return accumulated + liveSeconds;
}

export function getBreakRemainingSeconds(snapshot: BreakTimerSnapshot): number {
  return TRACKER_BREAK_LIMIT_SECONDS - getBreakElapsedSeconds(snapshot);
}

export function formatBreakRemainingSeconds(remainingSeconds: number): string {
  const normalizedSeconds = Math.floor(remainingSeconds);
  const isOverdue = normalizedSeconds < 0;
  const absoluteSeconds = Math.abs(normalizedSeconds);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const seconds = absoluteSeconds % 60;
  const formatted = [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

  return isOverdue ? `-${formatted}` : formatted;
}

function normalizeElapsedSeconds(totalSeconds: number): number {
  if (!Number.isFinite(totalSeconds)) {
    return 0;
  }

  return Math.max(0, Math.floor(totalSeconds));
}
