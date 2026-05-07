import assert from "node:assert/strict";

import {
  computeWorkerDisplayStatus,
  getShiftDefinition,
  isWorkerStoredStatus,
  type TrackerCardDTO,
  type WorkerDisplayStatus,
  type WorkerRole,
  type WorkerShift,
  type WorkerStoredStatus,
  workerStoredStatuses,
} from "../lib/workers";
import {
  filterAndSortTrackerCards,
  filterTrackerCards,
  parseTrackerFilters,
  getTrackerRoleTabs,
  getTrackerStatusTabs,
  scopeTrackerCards,
  sortTrackerCards,
} from "../lib/tracker/helpers";

assert.deepEqual(parseTrackerFilters({ q: "  KRU-001  " }), {
  q: "KRU-001",
  role: null,
  shift: null,
  status: null,
});

assert.deepEqual(
  parseTrackerFilters({
    q: "x".repeat(100),
    role: "Support",
    shift: ["A", "B"],
    status: "late",
  }),
  {
    q: "x".repeat(80),
    role: null,
    shift: null,
    status: null,
  },
);

assert.deepEqual(
  parseTrackerFilters({
    role: "Customer Service",
    shift: "flexible",
    status: "ALPHA",
  }),
  {
    q: "",
    role: "Customer Service",
    shift: "flexible",
    status: "ALPHA",
  },
);

const cards = [
  buildCard({
    displayStatus: "OFF",
    gid: "KRU-003",
    name: "Citra",
    userId: "user-3",
  }),
  buildCard({
    displayStatus: "ALPHA",
    gid: "KRU-002",
    name: "Bima",
    userId: "user-2",
  }),
  buildCard({
    displayStatus: "LATE",
    gid: "KRU-001",
    name: "Alya",
    userId: "user-1",
  }),
];

assert.deepEqual(
  sortTrackerCards(cards).map((card) => card.displayStatus),
  ["ALPHA", "LATE", "OFF"],
);

assert.deepEqual(
  filterTrackerCards(cards, parseTrackerFilters({ q: "kru-001" })).map(
    (card) => card.gid,
  ),
  ["KRU-001"],
);

assert.deepEqual(
  filterTrackerCards(cards, parseTrackerFilters({ q: "bima" })).map(
    (card) => card.gid,
  ),
  ["KRU-002"],
);

assert.deepEqual(
  filterAndSortTrackerCards(cards, parseTrackerFilters({ status: "OFF" })).map(
    (card) => card.gid,
  ),
  ["KRU-003"],
);

for (const currentStatus of workerStoredStatuses) {
  assert.equal(
    computeWorkerDisplayStatus({
      alphaDone: true,
      currentStatus,
      isFlexible: false,
      now: new Date("2026-04-27T00:00:00.000Z"),
      shift: getShiftDefinition("A"),
    }),
    "ALPHA",
  );
}

assert.equal(isWorkerStoredStatus("late"), false);
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

const memberScopedCards = scopeTrackerCards(cards, {
  tier: "member",
  userId: "user-2",
});

assert.deepEqual(
  filterAndSortTrackerCards(memberScopedCards, parseTrackerFilters({ q: "KRU" })).map(
    (card) => card.userId,
  ),
  ["user-2"],
);

assert.deepEqual(
  getTrackerRoleTabs(memberScopedCards).map((tab) => [tab.label, tab.count]),
  [
    ["All", 1],
    ["Professional Player", 1],
    ["Expert Player", 0],
    ["Customer Service", 0],
    ["Explorer", 0],
    ["Security", 0],
    ["Cleaning", 0],
    ["Internship", 0],
  ],
);

assert.deepEqual(
  getTrackerStatusTabs(cards).map((tab) => [tab.label, tab.count]),
  [
    ["OFF", 1],
    ["ON", 0],
    ["BREAK", 0],
    ["CUTI", 0],
    ["SAKIT", 0],
    ["PENDING", 0],
    ["LEMBUR", 0],
    ["LATE", 1],
    ["ALPHA", 1],
  ],
);

console.log("Tracker read-only tests passed.");

function buildCard({
  displayStatus,
  employeeRole = "Professional Player",
  gid,
  name,
  shift = "A",
  storedStatus = "off",
  userId,
}: {
  displayStatus: WorkerDisplayStatus;
  employeeRole?: WorkerRole;
  gid: string;
  name: string;
  shift?: WorkerShift;
  storedStatus?: WorkerStoredStatus;
  userId: string;
}): TrackerCardDTO {
  return {
    cutiStock: 2,
    displayStatus,
    employeeRole,
    gid,
    isFlexible: shift === "flexible",
    name,
    shift,
    showCard: true,
    statusUpdatedAt: "2026-04-27T00:00:00.000Z",
    storedStatus,
    userId,
    version: 0,
  };
}
