import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const projectRoot = process.cwd();
const trackerPagePath = resolve(projectRoot, "app/admin/(shell)/tracker/page.tsx");
const trackerCardPath = resolve(
  projectRoot,
  "components/admin/tracker/tracker-card.tsx",
);
const trackerActionControlsPath = resolve(
  projectRoot,
  "components/admin/tracker/tracker-action-controls.tsx",
);
const trackerDataPath = resolve(projectRoot, "lib/tracker/data.ts");
const trackerActionsPath = resolve(projectRoot, "lib/workers/tracker-actions.ts");
const workerTypesPath = resolve(projectRoot, "lib/workers/types.ts");

assert.ok(
  existsSync(trackerActionControlsPath),
  "Tracker action controls must exist for R2C-B-04 controlled activation.",
);

const trackerPageSource = readFileSync(trackerPagePath, "utf8");
const trackerCardSource = readFileSync(trackerCardPath, "utf8");
const trackerActionControlsSource = readFileSync(trackerActionControlsPath, "utf8");
const trackerActionsSource = readFileSync(trackerActionsPath, "utf8");
const trackerDataSource = readFileSync(trackerDataPath, "utf8");
const workerTypesSource = readFileSync(workerTypesPath, "utf8");

assert.match(
  trackerActionControlsSource,
  /^"use client";/,
  "Tracker action controls must be a client component.",
);
assertIncludes(trackerActionControlsSource, 'from "@/app/admin/(shell)/tracker/actions"');
assertIncludes(trackerActionControlsSource, "applyTrackerAction({");
assertIncludes(trackerActionControlsSource, "targetUserId: card.userId");
assertIncludes(trackerActionControlsSource, "expectedVersion: card.version");
assertIncludes(trackerActionControlsSource, "action");
assertIncludes(trackerActionControlsSource, "useTransition");
assertIncludes(trackerActionControlsSource, "useState");
assertIncludes(trackerActionControlsSource, "useRouter");
assertIncludes(trackerActionControlsSource, 'router.refresh()');
assertIncludes(trackerActionControlsSource, 'aria-live="polite"');
assertIncludes(trackerActionControlsSource, 'displayStatus === "OFF" || card.displayStatus === "LATE"');
assertIncludes(trackerActionControlsSource, 'card.storedStatus === "off"');
assertIncludes(trackerActionControlsSource, 'card.storedStatus === "on"');
assertIncludes(trackerActionControlsSource, 'card.storedStatus === "break"');
assertIncludes(trackerActionControlsSource, 'card.displayStatus === "ON"');
assertIncludes(trackerActionControlsSource, 'card.displayStatus === "BREAK"');
assertIncludes(trackerActionControlsSource, '"START"');
assertIncludes(trackerActionControlsSource, '"ISTIRAHAT"');
assertIncludes(trackerActionControlsSource, '"LANJUT"');
assertIncludes(trackerActionControlsSource, '"SELESAI"');
assertIncludes(trackerActionControlsSource, '"CUTI"');
assertIncludes(trackerActionControlsSource, '"IZIN"');
assertIncludes(trackerActionControlsSource, '"SAKIT"');
assertIncludes(trackerActionControlsSource, 'label: "START"');
assertIncludes(trackerActionControlsSource, "label: `CUTI ${card.cutiStock}`");
assertIncludes(trackerActionControlsSource, 'label: "SAKIT"');
assertIncludes(trackerActionControlsSource, 'label: "PENDING"');
assertIncludes(trackerActionControlsSource, 'action: "IZIN"');
assertIncludes(trackerActionControlsSource, 'label: "FINISH"');
assertIncludes(trackerActionControlsSource, 'label: "BREAK"');
assertIncludes(trackerActionControlsSource, 'label: "STOP ISTIRAHAT"');
assertIncludes(trackerActionControlsSource, 'action: "LANJUT"');
assertIncludes(trackerActionControlsSource, "Ends break and returns to active work.");
assertIncludes(trackerActionControlsSource, "formatBreakDuration");
assertIncludes(trackerActionControlsSource, "breakAccumulatedSecs");
assertIncludes(trackerActionControlsSource, "breakStartedAt");
assertIncludes(trackerActionControlsSource, "breakTimerRunning");
assertIncludes(workerTypesSource, "breakAccumulatedSecs: number;");
assertIncludes(workerTypesSource, "breakStartedAt: string | null;");
assertIncludes(workerTypesSource, "breakTimerRunning: boolean;");
assertIncludes(trackerDataSource, "break_accumulated_secs");
assertIncludes(trackerDataSource, "break_started_at");
assertIncludes(trackerDataSource, "break_timer_running");
assertIncludes(trackerDataSource, "breakAccumulatedSecs: status.break_accumulated_secs");
assertIncludes(trackerDataSource, "breakStartedAt: status.break_started_at");
assertIncludes(trackerDataSource, "breakTimerRunning: status.break_timer_running");
assertNoPattern(
  trackerActionControlsSource,
  /label:\s*["']Izin["']/,
  "IZIN must be relabelled to PENDING for users.",
);
assertNoPattern(
  trackerActionControlsSource,
  /label:\s*(["'](?:Start|Sakit|Finish|Break|Stop Istirahat)["']|`Cuti \$\{card\.cutiStock\}`)/,
  "Tracker action labels must be uppercase for users.",
);
assertNoPattern(
  trackerActionControlsSource,
  /action:\s*["'](PENDING|PAUSE|RESUME)["']/,
  "Tracker controls must not introduce PENDING, PAUSE, or RESUME actions.",
);
assertNoPattern(
  trackerActionsSource,
  /["'](PENDING|PAUSE|RESUME)["']/,
  "Tracker action enum must not gain PENDING, PAUSE, or RESUME.",
);
assertNoPattern(
  trackerActionControlsSource,
  /\b(LEMBUR|Cancel|RESET|CORRECTION|break_late_seconds|storedStatus:\s*["']late["']|storedStatus:\s*["']izin["'])\b/i,
  "Active tracker controls must not add LEMBUR/cancel/reset/correction, break-late writes, or stored late/izin logic.",
);
assertNoPattern(
  trackerActionControlsSource,
  /\b(formAction|useActionState|useOptimistic)\b/,
  "Tracker action controls must not use formAction, useActionState, or optimistic mutation.",
);
assertNoPattern(
  trackerActionControlsSource,
  /\b(service_role|from\(\s*["']worker_(status|attendance|records|profiles)["']\s*\)|\.(insert|update|upsert|delete)\s*\()/i,
  "Tracker action controls must not use service role or write tracker tables directly.",
);

assertIncludes(trackerPageSource, "canStaffTierPerformTrackerAction");
assertIncludes(
  trackerPageSource,
  "const canApplyTrackerActions = canStaffTierPerformTrackerAction(staff.profile.tier);",
);
assertIncludes(trackerPageSource, "canApplyTrackerActions={canApplyTrackerActions}");
assertIncludes(trackerCardSource, "canApplyTrackerActions");
assertIncludes(trackerCardSource, "TrackerActionControls");
assertIncludes(trackerCardSource, "Self View");
assertIncludes(trackerCardSource, "R2C");
assertNoPattern(
  trackerPageSource,
  /staff\.profile\.tier\s*!==\s*["']member["']/,
  "Tracker page should use the shared tracker action permission helper.",
);

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

function assertIncludes(source: string, fragment: string) {
  assert.ok(
    normalize(source).includes(normalize(fragment)),
    `Missing tracker UI fragment: ${fragment}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

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
    breakAccumulatedSecs: 0,
    breakStartedAt: null,
    breakTimerRunning: false,
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
