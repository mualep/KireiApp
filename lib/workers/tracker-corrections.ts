import type { StaffTier } from "@/lib/auth/tiers";
import type { WorkerStoredStatus } from "@/lib/workers/types";

export const trackerCorrectionActions = [
  "CANCEL_CUTI",
  "CANCEL_SAKIT",
  "CANCEL_IZIN",
] as const;

export type TrackerCorrectionAction = (typeof trackerCorrectionActions)[number];

export const trackerCorrectionStatuses = {
  CANCEL_CUTI: "cuti",
  CANCEL_IZIN: "pending",
  CANCEL_SAKIT: "sakit",
} as const satisfies Record<TrackerCorrectionAction, WorkerStoredStatus>;

export const trackerCorrectionSourceActions = {
  CANCEL_CUTI: "tracker.cuti",
  CANCEL_IZIN: "tracker.izin",
  CANCEL_SAKIT: "tracker.sakit",
} as const satisfies Record<TrackerCorrectionAction, string>;

export type TrackerCorrectionTransitionResult =
  | {
      ok: true;
      sourceAction: (typeof trackerCorrectionSourceActions)[TrackerCorrectionAction];
      status: (typeof trackerCorrectionStatuses)[TrackerCorrectionAction];
    }
  | {
      ok: false;
      reason: "invalid_source_status" | "member_read_only";
    };

export function isTrackerCorrectionAction(value: unknown): value is TrackerCorrectionAction {
  return (
    typeof value === "string" &&
    trackerCorrectionActions.includes(value as TrackerCorrectionAction)
  );
}

export function evaluateTrackerCorrectionTransition({
  action,
  actorTier,
  storedStatus,
}: {
  action: TrackerCorrectionAction;
  actorTier: StaffTier;
  storedStatus: WorkerStoredStatus;
}): TrackerCorrectionTransitionResult {
  if (actorTier !== "owner" && actorTier !== "admin") {
    return { ok: false, reason: "member_read_only" };
  }

  const status = trackerCorrectionStatuses[action];

  if (storedStatus !== status) {
    return { ok: false, reason: "invalid_source_status" };
  }

  return {
    ok: true,
    sourceAction: trackerCorrectionSourceActions[action],
    status,
  };
}
