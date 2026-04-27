import assert from "node:assert/strict";

import {
  computeWorkerDisplayStatus,
  getShiftDefinition,
  isWorkerDisplayStatus,
  isWorkerRole,
  isWorkerShift,
  isWorkerStoredStatus,
  parseShiftTime,
  validateWorkerProfileInput,
  workerDisplayStatuses,
  workerRoles,
  workerShifts,
  workerStoredStatuses,
} from "../lib/workers";

const expectedRoles = [
  "Professional Player",
  "Expert Player",
  "Internship",
  "Customer Service",
  "Explorer",
  "Security",
  "Cleaning Service",
] as const;

const expectedShifts = ["A", "B", "C", "D", "E", "F", "1", "2", "3", "flexible"] as const;
const expectedStoredStatuses = ["off", "on", "break", "cuti", "sakit", "pending", "lembur"] as const;
const expectedDisplayStatuses = ["OFF", "ON", "BREAK", "CUTI", "SAKIT", "PENDING", "LEMBUR", "LATE", "ALPHA"] as const;

assert.deepEqual(workerRoles, expectedRoles);
assert.deepEqual(workerShifts, expectedShifts);
assert.deepEqual(workerStoredStatuses, expectedStoredStatuses);
assert.deepEqual(workerDisplayStatuses, expectedDisplayStatuses);

assert.equal(isWorkerRole("Customer Service"), true);
assert.equal(isWorkerRole("Support"), false);
assert.equal(isWorkerShift("flexible"), true);
assert.equal(isWorkerShift("night"), false);
assert.equal(isWorkerStoredStatus("off"), true);
assert.equal(isWorkerStoredStatus("late"), false);
assert.equal(isWorkerDisplayStatus("ALPHA"), true);
assert.equal(isWorkerDisplayStatus("late"), false);

assert.deepEqual(parseShiftTime("06:30"), { hour: 6, minute: 30 });
assert.equal(parseShiftTime("24:00"), null);
assert.equal(parseShiftTime("6:00"), null);

assert.deepEqual(getShiftDefinition("A"), {
  endHour: 14,
  endMinute: 0,
  isFlexible: false,
  label: "A",
  startHour: 6,
  startMinute: 0,
});
assert.deepEqual(getShiftDefinition("flexible"), {
  endHour: null,
  endMinute: null,
  isFlexible: true,
  label: "flexible",
  startHour: null,
  startMinute: null,
});

assert.equal(
  validateWorkerProfileInput({
    employeeRole: "Explorer",
    gid: "KRU-073",
    isFlexible: true,
    shift: "flexible",
    shiftEndHour: null,
    shiftEndMinute: null,
    shiftStartHour: null,
    shiftStartMinute: null,
  }).ok,
  true,
);

assert.deepEqual(
  validateWorkerProfileInput({
    employeeRole: "Explorer",
    gid: "KRU-073",
    isFlexible: true,
    shift: "flexible",
    shiftEndHour: 14,
    shiftEndMinute: 0,
    shiftStartHour: 6,
    shiftStartMinute: 0,
  }),
  {
    issues: ["Flexible workers must not have fixed shift times."],
    ok: false,
  },
);

assert.deepEqual(
  validateWorkerProfileInput({
    employeeRole: "Professional Player",
    gid: "KRU-001",
    isFlexible: false,
    shift: "A",
    shiftEndHour: null,
    shiftEndMinute: null,
    shiftStartHour: 6,
    shiftStartMinute: 0,
  }),
  {
    issues: ["Fixed-shift workers must have complete shift times."],
    ok: false,
  },
);

assert.equal(
  computeWorkerDisplayStatus({
    alphaDone: true,
    currentStatus: "off",
    isFlexible: false,
    now: new Date("2026-04-27T00:15:00.000Z"),
    shift: getShiftDefinition("A"),
  }),
  "ALPHA",
);

assert.equal(
  computeWorkerDisplayStatus({
    alphaDone: false,
    currentStatus: "off",
    isFlexible: false,
    now: new Date("2026-04-27T23:20:00.000Z"),
    shift: getShiftDefinition("A"),
  }),
  "LATE",
);

assert.equal(
  computeWorkerDisplayStatus({
    alphaDone: false,
    currentStatus: "off",
    isFlexible: true,
    now: new Date("2026-04-27T23:20:00.000Z"),
    shift: getShiftDefinition("flexible"),
  }),
  "OFF",
);

assert.equal(
  computeWorkerDisplayStatus({
    alphaDone: false,
    currentStatus: "break",
    isFlexible: false,
    now: new Date("2026-04-27T23:20:00.000Z"),
    shift: getShiftDefinition("A"),
  }),
  "BREAK",
);

console.log("Worker helper tests passed.");
