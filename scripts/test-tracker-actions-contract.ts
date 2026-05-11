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

const expectedTrackerActions = [
  "START",
  "ISTIRAHAT",
  "LANJUT",
  "SELESAI",
  "CUTI",
  "IZIN",
  "SAKIT",
] as const;

assert.deepEqual(trackerActions, expectedTrackerActions);
assert.equal(isTrackerAction("START"), true);
assert.equal(isTrackerAction("ALPHA"), false);
assert.equal(isTrackerAction("LEMBUR"), false);
assert.equal(trackerActions.includes("ALPHA" as never), false);

assert.deepEqual(trackerActionTargetStatuses, {
  CUTI: "cuti",
  ISTIRAHAT: "break",
  IZIN: "pending",
  LANJUT: "on",
  SAKIT: "sakit",
  SELESAI: "off",
  START: "on",
});

assert.deepEqual(trackerActionAttendanceStatuses, {
  CUTI: "cuti",
  ISTIRAHAT: null,
  IZIN: "pending",
  LANJUT: null,
  SAKIT: "sakit",
  SELESAI: null,
  START: "hadir",
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
  "2026-04-28",
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

console.log("Tracker action contract tests passed.");
