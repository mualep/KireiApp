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
import {
  TRACKER_BREAK_LIMIT_SECONDS,
  formatBreakRemainingSeconds,
  getBreakRemainingSeconds,
} from "../lib/tracker/break-timer";

const projectRoot = process.cwd();
const trackerPagePath = resolve(projectRoot, "app/admin/(shell)/tracker/page.tsx");
const trackerCardPath = resolve(
  projectRoot,
  "components/admin/tracker/tracker-card.tsx",
);
const trackerFilterFormPath = resolve(
  projectRoot,
  "components/admin/tracker/tracker-filter-form.tsx",
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
const trackerFilterFormSource = readFileSync(trackerFilterFormPath, "utf8");
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
assertIncludes(trackerActionControlsSource, "applyTrackerCorrection({");
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
assertIncludes(trackerActionControlsSource, 'label: "BATAL CUTI"');
assertIncludes(trackerActionControlsSource, 'label: "BATAL SAKIT"');
assertIncludes(trackerActionControlsSource, 'label: "BATAL PENDING"');
assertIncludes(trackerActionControlsSource, "attendanceId: card.activeTrackerAttendanceId");
assertIncludes(trackerActionControlsSource, "window.prompt");
assertNoPattern(trackerActionControlsSource, /"BREAK TIMER"|BREAK TIMER|Break Timer/, "Break timer area does not contain BREAK TIMER");
assertNoPattern(trackerActionControlsSource, /Ends break|returns to active/, "Break timer area does not contain Ends break");
assertIncludes(trackerActionControlsSource, "tracker-break-timer-large");
assertIncludes(trackerActionControlsSource, "formatBreakRemainingSeconds");
assertIncludes(trackerActionControlsSource, "getBreakRemainingSeconds");
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
  /\b(LEMBUR|RESET|break_late_seconds|storedStatus:\s*["']late["']|storedStatus:\s*["']izin["'])\b/i,
  "Active tracker controls must not add LEMBUR/reset, break-late writes, or stored late/izin logic.",
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

assert.equal(TRACKER_BREAK_LIMIT_SECONDS, 3600);
assert.equal(
  formatBreakRemainingSeconds(
    getBreakRemainingSeconds({
      accumulatedSeconds: 0,
      nowMs: null,
      startedAt: null,
      timerRunning: false,
    }),
  ),
  "01:00:00",
);
assert.equal(
  formatBreakRemainingSeconds(
    getBreakRemainingSeconds({
      accumulatedSeconds: 30 * 60,
      nowMs: null,
      startedAt: null,
      timerRunning: false,
    }),
  ),
  "00:30:00",
);
assert.equal(
  formatBreakRemainingSeconds(
    getBreakRemainingSeconds({
      accumulatedSeconds: 60 * 60,
      nowMs: null,
      startedAt: null,
      timerRunning: false,
    }),
  ),
  "00:00:00",
);
assert.equal(
  formatBreakRemainingSeconds(
    getBreakRemainingSeconds({
      accumulatedSeconds: 63 * 60 + 12,
      nowMs: null,
      startedAt: null,
      timerRunning: false,
    }),
  ),
  "-00:03:12",
);
assert.equal(
  getBreakRemainingSeconds({
    accumulatedSeconds: 60,
    nowMs: Date.parse("2026-05-11T00:02:00.000Z"),
    startedAt: "2026-05-11T00:00:00.000Z",
    timerRunning: true,
  }),
  TRACKER_BREAK_LIMIT_SECONDS - 180,
);

assertIncludes(trackerPageSource, "canStaffTierPerformTrackerAction");
assertIncludes(
  trackerPageSource,
  "const canApplyTrackerActions = canStaffTierPerformTrackerAction(staff.profile.tier);",
);
assertIncludes(trackerPageSource, "canApplyTrackerActions={canApplyTrackerActions}");
assertIncludes(trackerCardSource, "canApplyTrackerActions");
assertIncludes(trackerCardSource, "TrackerActionControls");
assertIncludes(trackerCardSource, "TrackerStatusBadge");
assertIncludes(trackerCardSource, 'data-slot="tracker-card-identity"');
assertIncludes(trackerCardSource, 'aria-label="Worker Identity"');
assertIncludes(trackerCardSource, 'data-slot="tracker-card-actions"');
assertIncludes(trackerCardSource, 'aria-label="Tracker action footer"');
assertNoPattern(trackerCardSource, /"Self View"|Self View/, "Card no longer renders Self View");
assertNoPattern(trackerCardSource, /ShieldIcon|Shield/, "Card no longer renders shield icon for member visual label");
assertIncludes(trackerCardSource, "<TrackerStatusBadge status={card.displayStatus} prominent />");
assertIncludes(readFileSync(resolve(projectRoot, "app/globals.css"), "utf8"), "tracker-status-badge-prominent");
assertIncludes(trackerCardSource, "R2C");

// ── D3 Refinement: removed UI elements ─────────────────────────────────────
assertNoPattern(
  trackerCardSource,
  /UserRoundIcon/,
  "Tracker card must no longer render avatar/person icon (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /IdCardIcon/,
  "Tracker card must no longer render GID icon (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /card\.gid/,
  "Tracker card must no longer render worker GID/profile ID (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /MetricChip/,
  "Tracker card must no longer render Role/Cuti/Stored/Version metadata boxes (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /data-slot="tracker-card-metadata"/,
  "Tracker card must no longer have metadata data-slot (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /data-slot="tracker-card-activity"/,
  "Tracker card must no longer have activity data-slot (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /"Updated"/,
  "Tracker card must no longer render Updated at section (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /"Break Used"/,
  "Tracker card must no longer render Break Used section (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /formatDuration/,
  "Tracker card must no longer use formatDuration helper (D3 removal).",
);
assertNoPattern(
  trackerCardSource,
  /updatedAtText/,
  "Tracker card must no longer accept or render updatedAtText (D3 removal).",
);

// ── D3 Refinement: added/improved UI elements ──────────────────────────────
assertIncludes(trackerCardSource, 'data-slot="tracker-card-records"');
assertIncludes(trackerCardSource, 'aria-label="Monthly Records"');
assertIncludes(trackerCardSource, "getShiftDefinition");
assertIncludes(trackerCardSource, "cutiStock");
assertIncludes(trackerCardSource, "TrackerActionControls");
assertIncludes(trackerCardSource, "TrackerStatusBadge");
assertIncludes(trackerCardSource, "card.name");
assertNoPattern(
  trackerCardSource,
  /from\s+["']@\/app\/admin\/\(shell\)\/tracker\/actions["']|applyTrackerAction\(|applyTrackerCorrection\(|@\/lib\/supabase|createClient|\.rpc\s*\(|fetch\(|\/api\/|Absensi|absensi|worker_status/i,
  "TrackerCard redesign must remain presentational and avoid data mutations, API calls, Supabase, or Absensi sync.",
);
assertNoPattern(
  trackerPageSource,
  /tracker-glass-panel flex min-h-10 items-center justify-between/,
  "Tracker page must not render the duplicate section header below the shared topbar.",
);
assertNoPattern(
  trackerPageSource,
  /statusTabs=\{statusTabs\}|getTrackerStatusTabs\(data\.cards\)/,
  "Tracker page must not pass status tabs into the toolbar UI.",
);
assertIncludes(trackerFilterFormSource, 'placeholder="Search worker name');
assertNoPattern(
  trackerFilterFormSource,
  /Search name or GID|placeholder=.*GID/,
  "Tracker toolbar search copy must not mention GID.",
);
assertIncludes(trackerFilterFormSource, 'aria-label="Tracker role groups"');
assertIncludes(trackerFilterFormSource, "tab.shortLabel");
assertIncludes(trackerFilterFormSource, "title={tab.label}");
assertIncludes(trackerFilterFormSource, "aria-label={`${tab.label}: ${tab.count} workers`}");
assertNoPattern(
  trackerFilterFormSource,
  /Tracker status groups|statusTabs\.map|<TrackerStatusBadge status=\{tab\.value\} compact/,
  "Tracker toolbar must remove the noisy status tabs row.",
);
assertNoPattern(
  trackerFilterFormSource,
  /overflow-x-auto|min-w-max/,
  "Tracker role tabs must wrap inside the toolbar instead of creating horizontal overflow.",
);
assertIncludes(trackerFilterFormSource, 'id="tracker-shift"');
assertIncludes(trackerFilterFormSource, 'id="tracker-status"');
assertIncludes(trackerFilterFormSource, 'id="tracker-sort"');
assertIncludes(trackerFilterFormSource, "visibleCount}/{readableCount");
assertIncludes(trackerFilterFormSource, "Clear");
assertIncludes(trackerFilterFormSource, "router.replace");
assertIncludes(trackerFilterFormSource, "{ scroll: false }");
assertIncludes(trackerFilterFormSource, "window.setTimeout");
assertIncludes(trackerFilterFormSource, "window.clearTimeout");
assertIncludes(trackerFilterFormSource, "300");
assertNoPattern(
  trackerFilterFormSource,
  /onSubmit=|handleSubmit|type="submit"|>\s*Apply\s*</,
  "Tracker filters should auto-apply without a form-driven Apply flow.",
);
assertNoPattern(
  trackerFilterFormSource,
  /router\.push|new FormData|<form|\bformData\b|name="role"/,
  "Tracker filter UI should use URL-backed router.replace state, not submit-only form plumbing.",
);
assertIncludes(
  trackerPageSource,
  'className="flex flex-col gap-6"',
);
assertNoPattern(
  trackerPageSource,
  /sticky\s+top-24\s+z-20|fixed\s+top-|z-20/,
  "Tracker filter section must scroll with page content; only the global Admin topbar is sticky.",
);
assertNoPattern(
  trackerPageSource,
  /className="flex flex-col gap-4"/,
  "Tracker toolbar-to-grid rhythm should use the larger D2-B gap-6 spacing.",
);
assertIncludes(
  trackerPageSource,
  'className="tracker-card-grid gap-3"',
);
assertNoPattern(
  trackerPageSource,
  /tracker-card-grid\s+mt-1\.5|gap-2\.5/,
  "Tracker toolbar-to-grid rhythm should use the shared gap-4 page rhythm.",
);
assertNoPattern(
  trackerPageSource,
  /staff\.profile\.tier\s*!==\s*["']member["']/,
  "Tracker page should use the shared tracker action permission helper.",
);

assert.deepEqual(parseTrackerFilters({ q: "  KRU-001  " }), {
  q: "KRU-001",
  role: null,
  shift: null,
  sort: "status-urgent",
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
    sort: "status-urgent",
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
    sort: "status-urgent",
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
  getTrackerRoleTabs(memberScopedCards).map((tab) => [
    tab.label,
    tab.shortLabel,
    tab.count,
  ]),
  [
    ["All", "All", 1],
    ["Professional Player", "PP", 1],
    ["Expert Player", "EP", 0],
    ["Customer Service", "CS", 0],
    ["Explorer", "EX", 0],
    ["Security", "SC", 0],
    ["Cleaning Service", "CL", 0],
    ["Internship", "IN", 0],
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

// ── D3-B: Sorting must work ────────────────────────────────────────────────
assertNoPattern(
  trackerFilterFormSource,
  /id="tracker-sort"[^>]*disabled/,
  "Tracker sort select must not be disabled (D3-B sorting fix).",
);
assertIncludes(trackerFilterFormSource, "handleSortChange");
assertIncludes(trackerFilterFormSource, "status-urgent");
assertIncludes(trackerFilterFormSource, "name-asc");

const trackerHelpersPath = resolve(projectRoot, "lib/tracker/helpers.ts");
const trackerHelpersSource = readFileSync(trackerHelpersPath, "utf8");
assertIncludes(trackerHelpersSource, "sort:");
assertIncludes(trackerHelpersSource, "TrackerSortOption");

// ── D3-B: Status badge shape (rounded rectangle, not pill) ─────────────────
const globalsSource = readFileSync(resolve(projectRoot, "app/globals.css"), "utf8");
assertIncludes(globalsSource, "tracker-status-badge-prominent");
assertNoPattern(
  globalsSource,
  /tracker-status-badge-prominent[\s\S]*?box-shadow:\s*0\s+0\s+12px/,
  "Status badge prominent must not have excessive glow (D3-B).",
);
assertIncludes(trackerCardSource, "rounded-xl");

// ── D3-B: Worker name size ─────────────────────────────────────────────────
assertIncludes(trackerCardSource, "text-lg");

// ── D3-B: Responsive role label ────────────────────────────────────────────
assertIncludes(trackerCardSource, "card.employeeRole");
assertIncludes(trackerCardSource, "compactRoleLabels");

// ── D3-B: Break timer contextual colour ────────────────────────────────────
assertIncludes(trackerActionControlsSource, "getBreakTimerColorClass");
assertIncludes(trackerActionControlsSource, "tracker-timer-normal");
assertIncludes(trackerActionControlsSource, "tracker-timer-warning");
assertIncludes(trackerActionControlsSource, "tracker-timer-overdue");
assertIncludes(globalsSource, "tracker-timer-normal");
assertIncludes(globalsSource, "tracker-timer-warning");
assertIncludes(globalsSource, "tracker-timer-overdue");

// ── D3-B: Action button monochrome styling ─────────────────────────────────
assertIncludes(trackerActionControlsSource, "tracker-action-btn");
assertIncludes(globalsSource, "tracker-action-btn");
assertNoPattern(
  trackerActionControlsSource,
  /\bLEMBUR\b/,
  "Tracker controls must not render LEMBUR action (D3-B guardrail).",
);

// ── D3-C: Sort options (4 options, labels and values) ──────────────────────
assertIncludes(trackerFilterFormSource, "Name &#x2192; A-Z");
assertIncludes(trackerFilterFormSource, "Name &#x2192; Z-A");
assertIncludes(trackerFilterFormSource, "Status &#x2192; Urgent");
assertIncludes(trackerFilterFormSource, "Status &#x2192; Tidak Urgent");
assertIncludes(trackerFilterFormSource, "name-asc");
assertIncludes(trackerFilterFormSource, "name-desc");
assertIncludes(trackerFilterFormSource, "status-urgent");
assertIncludes(trackerFilterFormSource, "status-not-urgent");
assertNoPattern(
  trackerFilterFormSource,
  /Critical[^"]*A-Z|critical-name/,
  "Old Critical \u2192 A-Z option and critical-name value must be removed (D3-C).",
);
assertIncludes(trackerHelpersSource, "name-desc");
assertIncludes(trackerHelpersSource, "status-urgent");
assertIncludes(trackerHelpersSource, "status-not-urgent");

// ── D3-C: Sort functional tests ──────────────────────────────────────────────
assert.deepEqual(
  filterAndSortTrackerCards(cards, parseTrackerFilters({ sort: "name-desc" })).map((c) => c.name),
  ["Citra", "Bima", "Alya"],
);
assert.deepEqual(
  filterAndSortTrackerCards(cards, parseTrackerFilters({ sort: "status-urgent" })).map(
    (c) => c.displayStatus,
  ),
  ["ALPHA", "LATE", "OFF"],
);
assert.deepEqual(
  filterAndSortTrackerCards(cards, parseTrackerFilters({ sort: "status-not-urgent" })).map(
    (c) => c.displayStatus,
  ),
  ["OFF", "LATE", "ALPHA"],
);

// ── D3-C: Backward compat — critical-name falls back to status-urgent ─────────
assert.deepEqual(parseTrackerFilters({ sort: "critical-name" }), {
  q: "",
  role: null,
  shift: null,
  sort: "status-urgent",
  status: null,
});

// ── D3-C: Action controls outer bordered container removed ────────────────────
assertNoPattern(
  trackerCardSource,
  /aria-label="Tracker controls"/,
  "Outer action controls bordered wrapper must be removed (D3-C).",
);

// ── D3-C: Card balanced padding (larger side, smaller top) ───────────────────
assertIncludes(trackerCardSource, "pt-3");
assertIncludes(trackerCardSource, "px-4");

// ── D3-C: Status badge rectangular (radius-sm, not radius-lg, not pill) ───────
assertNoPattern(
  globalsSource,
  /tracker-status-badge-prominent[\s\S]*?border-radius:\s*var\(--radius-lg\)/,
  "Status badge prominent must not use radius-lg — should use radius-sm for rect shape (D3-C).",
);

// ── D3-C: Action button data-tone (monochrome normal, colour on hover) ─────────
assertIncludes(trackerActionControlsSource, "data-tone");
assertIncludes(globalsSource, "data-tone");

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
    activeTrackerAttendanceId: null,
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
