import assert from "node:assert/strict";

import {
  computeTrackerWorkLateSeconds,
  deriveTrackerAttendanceDate,
  evaluateTrackerActionTransition,
  getShiftDefinition,
  isTrackerAction,
  trackerActionAttendanceStatuses,
  trackerActions,
  trackerActionTargetStatuses,
  workerStoredStatuses,
} from "../lib/workers";
import {
  evaluateTrackerCorrectionTransition,
  isTrackerCorrectionAction,
  trackerCorrectionActions,
  trackerCorrectionSourceActions,
  trackerCorrectionStatuses,
} from "../lib/workers/tracker-corrections";
import {
  evaluateTrackerExpiredAbsenceCloseTransition,
  getTrackerCorrectionWindowState,
  isTrackerExpiredAbsenceCloseAction,
  trackerExpiredAbsenceCloseActions,
  trackerExpiredAbsenceCloseStatuses,
} from "../lib/workers/tracker-absence-close";
import {
  canStaffTierMaterializeTrackerAbsence,
  getTrackerAbsenceMaterializationMissingDates,
  isTrackerAbsenceMaterializationAction,
  trackerAbsenceMaterializationActions,
  trackerAbsenceMaterializationStatuses,
} from "../lib/workers/tracker-absence-materialization";

const expectedTrackerActions = [
  "START",
  "ISTIRAHAT",
  "LANJUT",
  "SELESAI",
  "CUTI",
  "IZIN",
  "SAKIT",
  "LEMBUR",
  "BATAL_LEMBUR",
  "CANCEL_START",
  "TERIMA_ALPHA",
] as const;

assert.deepEqual(trackerActions, expectedTrackerActions);
assert.equal(isTrackerAction("START"), true);
assert.equal(isTrackerAction("ALPHA"), false);
assert.equal(isTrackerAction("LEMBUR"), true);
assert.equal(isTrackerAction("BATAL_LEMBUR"), true);
assert.equal(isTrackerAction("CANCEL_START"), true);
assert.equal(isTrackerAction("PAUSE"), false);
assert.equal(isTrackerAction("RESUME"), false);
assert.equal(isTrackerAction("STOP"), false);
assert.equal(trackerActions.includes("ALPHA" as never), false);

assert.deepEqual(trackerActionTargetStatuses, {
  CUTI: "cuti",
  ISTIRAHAT: "break",
  IZIN: "pending",
  LANJUT: "on",
  SAKIT: "sakit",
  SELESAI: "off",
  START: "on",
  LEMBUR: "lembur",
  BATAL_LEMBUR: "off",
  CANCEL_START: "off",
  TERIMA_ALPHA: "off",
});

assert.deepEqual(trackerActionAttendanceStatuses, {
  CUTI: "cuti",
  ISTIRAHAT: null,
  IZIN: "pending",
  LANJUT: null,
  SAKIT: "sakit",
  SELESAI: null,
  START: "hadir",
  LEMBUR: null,
  BATAL_LEMBUR: null,
  CANCEL_START: null,
  TERIMA_ALPHA: null,
});

assert.equal(workerStoredStatuses.includes("late" as never), false);
assert.equal(Object.values(trackerActionTargetStatuses).includes("late" as never), false);
assert.equal(
  Object.values(trackerActionAttendanceStatuses).includes("alpha" as never),
  false,
);

assert.deepEqual(
  evaluateTrackerActionTransition({
    action: "START",
    actorTier: "member",
    displayStatus: "OFF",
    storedStatus: "off",
  }),
  {
    ok: false,
    reason: "member_read_only",
  },
);

assert.deepEqual(
  evaluateTrackerActionTransition({
    action: "START",
    actorTier: "admin",
    displayStatus: "ALPHA",
    storedStatus: "off",
  }),
  {
    ok: false,
    reason: "alpha_rejected",
  },
);

for (const action of ["START", "CUTI", "IZIN", "SAKIT"] as const) {
  assert.deepEqual(
    evaluateTrackerActionTransition({
      action,
      actorTier: "owner",
      displayStatus: "OFF",
      storedStatus: "off",
    }),
    {
      attendanceStatus: trackerActionAttendanceStatuses[action],
      ok: true,
      targetStatus: trackerActionTargetStatuses[action],
    },
  );

  assert.deepEqual(
    evaluateTrackerActionTransition({
      action,
      actorTier: "owner",
      displayStatus: "LATE",
      storedStatus: "off",
    }),
    {
      attendanceStatus: trackerActionAttendanceStatuses[action],
      ok: true,
      targetStatus: trackerActionTargetStatuses[action],
    },
  );

  assert.deepEqual(
    evaluateTrackerActionTransition({
      action,
      actorTier: "owner",
      displayStatus: "ON",
      storedStatus: "on",
    }),
    {
      ok: false,
      reason: "invalid_source_status",
    },
  );
}

assert.deepEqual(
  evaluateTrackerActionTransition({
    action: "ISTIRAHAT",
    actorTier: "admin",
    displayStatus: "ON",
    storedStatus: "on",
  }),
  {
    attendanceStatus: null,
    ok: true,
    targetStatus: "break",
  },
);

assert.deepEqual(
  evaluateTrackerActionTransition({
    action: "LANJUT",
    actorTier: "admin",
    displayStatus: "BREAK",
    storedStatus: "break",
  }),
  {
    attendanceStatus: null,
    ok: true,
    targetStatus: "on",
  },
);

assert.deepEqual(
  evaluateTrackerActionTransition({
    action: "SELESAI",
    actorTier: "admin",
    displayStatus: "ON",
    storedStatus: "on",
  }),
  {
    attendanceStatus: null,
    ok: true,
    targetStatus: "off",
  },
);

assert.deepEqual(
  evaluateTrackerActionTransition({
    action: "ISTIRAHAT",
    actorTier: "admin",
    displayStatus: "OFF",
    storedStatus: "off",
  }),
  {
    ok: false,
    reason: "invalid_source_status",
  },
);

assert.equal(
  deriveTrackerAttendanceDate({
    now: new Date("2026-04-26T23:30:00.000Z"),
    shift: getShiftDefinition("A"),
  }),
  "2026-04-27",
);

assert.equal(
  deriveTrackerAttendanceDate({
    now: new Date("2026-04-27T22:30:00.000Z"),
    shift: getShiftDefinition("E"),
  }),
  "2026-04-27",
);

assert.equal(
  deriveTrackerAttendanceDate({
    now: new Date("2026-04-27T22:30:00.000Z"),
    shift: getShiftDefinition("flexible"),
  }),
  "2026-04-27",
);

assert.equal(
  computeTrackerWorkLateSeconds({
    now: new Date("2026-04-26T23:10:00.000Z"),
    shift: getShiftDefinition("A"),
  }),
  0,
);

assert.equal(
  computeTrackerWorkLateSeconds({
    now: new Date("2026-04-26T23:11:00.000Z"),
    shift: getShiftDefinition("A"),
  }),
  60,
);

assert.equal(
  computeTrackerWorkLateSeconds({
    now: new Date("2026-04-27T23:20:00.000Z"),
    shift: getShiftDefinition("flexible"),
  }),
  0,
);

assert.deepEqual(trackerCorrectionActions, [
  "CANCEL_CUTI",
  "CANCEL_SAKIT",
  "CANCEL_IZIN",
]);
assert.deepEqual(trackerCorrectionStatuses, {
  CANCEL_CUTI: "cuti",
  CANCEL_IZIN: "pending",
  CANCEL_SAKIT: "sakit",
});
assert.deepEqual(trackerCorrectionSourceActions, {
  CANCEL_CUTI: "tracker.cuti",
  CANCEL_IZIN: "tracker.izin",
  CANCEL_SAKIT: "tracker.sakit",
});
assert.equal(isTrackerCorrectionAction("CANCEL_CUTI"), true);
assert.equal(isTrackerCorrectionAction("CANCEL_ALPHA"), false);
assert.deepEqual(
  evaluateTrackerCorrectionTransition({
    action: "CANCEL_CUTI",
    actorTier: "owner",
    storedStatus: "cuti",
  }),
  { ok: true, sourceAction: "tracker.cuti", status: "cuti" },
);
assert.deepEqual(
  evaluateTrackerCorrectionTransition({
    action: "CANCEL_SAKIT",
    actorTier: "member",
    storedStatus: "sakit",
  }),
  { ok: false, reason: "member_read_only" },
);
assert.deepEqual(
  evaluateTrackerCorrectionTransition({
    action: "CANCEL_IZIN",
    actorTier: "admin",
    storedStatus: "cuti",
  }),
  { ok: false, reason: "invalid_source_status" },
);

assert.deepEqual(trackerAbsenceMaterializationActions, ["MATERIALIZE_ABSENCE_DAYS"]);
assert.deepEqual(trackerAbsenceMaterializationStatuses, ["cuti", "sakit", "pending"]);
assert.equal(isTrackerAbsenceMaterializationAction("MATERIALIZE_ABSENCE_DAYS"), true);
assert.equal(isTrackerAbsenceMaterializationAction("CLOSE_EXPIRED_ABSENCE"), false);
assert.equal(isTrackerAbsenceMaterializationAction("LEMBUR"), false);
assert.equal(canStaffTierMaterializeTrackerAbsence("owner"), true);
assert.equal(canStaffTierMaterializeTrackerAbsence("admin"), true);
assert.equal(canStaffTierMaterializeTrackerAbsence("member"), false);
assert.deepEqual(
  getTrackerAbsenceMaterializationMissingDates({
    currentAttendanceDate: "2026-06-13",
    existingAttendanceDates: new Set(["2026-06-10", "2026-06-12"]),
    markerDate: "2026-06-10",
  }),
  ["2026-06-11", "2026-06-13"],
  "Materialization should only return truly missing dates through the current tracker date.",
);
assert.deepEqual(
  getTrackerAbsenceMaterializationMissingDates({
    currentAttendanceDate: "2026-06-10",
    existingAttendanceDates: new Set(["2026-06-10"]),
    markerDate: "2026-06-10",
  }),
  [],
  "Materialization should be idempotent when all dates already exist.",
);
assert.deepEqual(
  getTrackerAbsenceMaterializationMissingDates({
    currentAttendanceDate: "2026-06-09",
    existingAttendanceDates: new Set(),
    markerDate: "2026-06-10",
  }),
  [],
  "Materialization must never generate future dates.",
);

assert.deepEqual(trackerExpiredAbsenceCloseActions, ["CLOSE_EXPIRED_ABSENCE"]);
assert.deepEqual(trackerExpiredAbsenceCloseStatuses, ["cuti", "sakit", "pending"]);
assert.equal(isTrackerExpiredAbsenceCloseAction("CLOSE_EXPIRED_ABSENCE"), true);
assert.equal(isTrackerExpiredAbsenceCloseAction("CANCEL_CUTI"), false);
assert.equal(isTrackerExpiredAbsenceCloseAction("LEMBUR"), false);
assert.deepEqual(
  evaluateTrackerExpiredAbsenceCloseTransition({
    action: "CLOSE_EXPIRED_ABSENCE",
    actorTier: "owner",
    isExpired: true,
    storedStatus: "cuti",
  }),
  { ok: true, targetStatus: "off" },
);
assert.deepEqual(
  evaluateTrackerExpiredAbsenceCloseTransition({
    action: "CLOSE_EXPIRED_ABSENCE",
    actorTier: "admin",
    isExpired: true,
    storedStatus: "pending",
  }),
  { ok: true, targetStatus: "off" },
);
assert.deepEqual(
  evaluateTrackerExpiredAbsenceCloseTransition({
    action: "CLOSE_EXPIRED_ABSENCE",
    actorTier: "member",
    isExpired: true,
    storedStatus: "sakit",
  }),
  { ok: false, reason: "member_read_only" },
);
assert.equal(
  Object.values(trackerActionTargetStatuses).includes("late" as never),
  false,
  "Expired absence close must not introduce a stored LATE transition.",
);
assert.equal(
  evaluateTrackerExpiredAbsenceCloseTransition({
    action: "CLOSE_EXPIRED_ABSENCE",
    actorTier: "owner",
    isExpired: true,
    storedStatus: "sakit",
  }).ok,
  true,
  "Expired SAKIT close must stay operational-only and separate from correction reversal.",
);
assert.deepEqual(
  evaluateTrackerExpiredAbsenceCloseTransition({
    action: "CLOSE_EXPIRED_ABSENCE",
    actorTier: "owner",
    isExpired: false,
    storedStatus: "cuti",
  }),
  { ok: false, reason: "not_expired" },
);
assert.deepEqual(
  evaluateTrackerExpiredAbsenceCloseTransition({
    action: "CLOSE_EXPIRED_ABSENCE",
    actorTier: "owner",
    isExpired: true,
    storedStatus: "off",
  }),
  { ok: false, reason: "invalid_source_status" },
);
assert.equal(
  getTrackerCorrectionWindowState({
    attendanceDate: "2026-06-13",
    isFlexible: true,
    now: new Date("2026-06-13T10:00:00.000Z"),
    shiftEndHour: null,
    shiftEndMinute: null,
    shiftStartHour: null,
    shiftStartMinute: null,
  }),
  "open",
);
assert.equal(
  getTrackerCorrectionWindowState({
    attendanceDate: "2026-06-12",
    isFlexible: true,
    now: new Date("2026-06-13T10:00:00.000Z"),
    shiftEndHour: null,
    shiftEndMinute: null,
    shiftStartHour: null,
    shiftStartMinute: null,
  }),
  "expired",
);
assert.equal(
  getTrackerCorrectionWindowState({
    attendanceDate: "2026-06-13",
    isFlexible: false,
    now: new Date("2026-06-13T09:59:00.000Z"),
    shiftEndHour: 17,
    shiftEndMinute: 0,
    shiftStartHour: 8,
    shiftStartMinute: 0,
  }),
  "open",
);
assert.equal(
  getTrackerCorrectionWindowState({
    attendanceDate: "2026-06-13",
    isFlexible: false,
    now: new Date("2026-06-13T10:00:00.000Z"),
    shiftEndHour: 17,
    shiftEndMinute: 0,
    shiftStartHour: 8,
    shiftStartMinute: 0,
  }),
  "expired",
);

console.log("Tracker action contract tests passed.");
