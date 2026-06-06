import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import type { AbsensiWorkerRowDTO } from "../lib/absensi/data";
import {
  filterAbsensiRows,
  getAbsensiRoleTabs,
  hasAbsensiFilters,
  parseAbsensiFilters,
} from "../lib/absensi/filters";

const projectRoot = process.cwd();
const absensiPagePath = resolve(projectRoot, "app/admin/(shell)/absensi/page.tsx");
const absensiActionPath = resolve(projectRoot, "app/admin/(shell)/absensi/actions.ts");
const absensiDataPath = resolve(projectRoot, "lib/absensi/data.ts");
const absensiFiltersPath = resolve(projectRoot, "lib/absensi/filters.ts");
const absensiHelpersPath = resolve(projectRoot, "lib/absensi/helpers.ts");
const absensiGridPath = resolve(
  projectRoot,
  "components/admin/absensi/absensi-month-grid.tsx",
);
const absensiToolbarPath = resolve(
  projectRoot,
  "components/admin/absensi/absensi-toolbar.tsx",
);
const absensiDialogPath = resolve(
  projectRoot,
  "components/admin/absensi/absensi-correction-dialog.tsx",
);
const absensiComponentsDir = resolve(projectRoot, "components/admin/absensi");
const appDir = resolve(projectRoot, "app");
const packageJsonPath = resolve(projectRoot, "package.json");
const deferredRequestsPath = resolve(
  projectRoot,
  "docs/plans/absensi-tracker-sync-deferred-requests.md",
);
const prdFreezeChecklistPath = resolve(
  projectRoot,
  "docs/plans/prd-v1-freeze-checklist.md",
);

for (const path of [
  absensiPagePath,
  absensiActionPath,
  absensiDataPath,
  absensiFiltersPath,
  absensiHelpersPath,
  absensiGridPath,
  absensiToolbarPath,
  absensiDialogPath,
  deferredRequestsPath,
  prdFreezeChecklistPath,
]) {
  assert.ok(existsSync(path), `${path} must exist for R3D-C correction UI.`);
}

const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const pageSource = readFileSync(absensiPagePath, "utf8");
const actionSource = readFileSync(absensiActionPath, "utf8");
const dataSource = readFileSync(absensiDataPath, "utf8");
const filtersSource = readFileSync(absensiFiltersPath, "utf8");
const helpersSource = readFileSync(absensiHelpersPath, "utf8");
const gridSource = readFileSync(absensiGridPath, "utf8");
const toolbarSource = readFileSync(absensiToolbarPath, "utf8");
const dialogSource = readFileSync(absensiDialogPath, "utf8");
const deferredRequestsSource = readFileSync(deferredRequestsPath, "utf8");
const prdFreezeChecklistSource = readFileSync(prdFreezeChecklistPath, "utf8");
const componentSources = listFiles(absensiComponentsDir)
  .filter((filePath) => filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");
const uiSources = [pageSource, gridSource, dialogSource].join("\n");

assertIncludes(packageJsonSource, '"test:absensi-correction-ui"');

const filterRows: AbsensiWorkerRowDTO[] = [
  {
    cellsByDate: {},
    employeeRole: "Professional Player",
    gid: "KRU-001",
    name: "Budi Santoso",
    shift: "A",
    userId: "10000000-0000-4000-8000-000000000001",
  },
  {
    cellsByDate: {},
    employeeRole: "Cleaning Service",
    gid: "BUDI-999",
    name: "Sari Wangi",
    shift: "B",
    userId: "10000000-0000-4000-8000-000000000002",
  },
];

assert.deepEqual(parseAbsensiFilters({ q: "  budi   santoso  " }), {
  q: "budi santoso",
  role: null,
});
assert.equal(parseAbsensiFilters({ q: "x".repeat(90) }).q.length, 80);
assert.deepEqual(parseAbsensiFilters({ role: "Cleaning Service" }).role, "Cleaning Service");
assert.deepEqual(parseAbsensiFilters({ role: "Owner" }).role, null);
assert.equal(hasAbsensiFilters({ q: "", role: null }), false);
assert.equal(hasAbsensiFilters({ q: "sari", role: null }), true);
assert.deepEqual(
  filterAbsensiRows(filterRows, { q: "budi", role: null }).map((row) => row.name),
  ["Budi Santoso"],
);
assert.deepEqual(
  filterAbsensiRows(filterRows, { q: "", role: "Cleaning Service" }).map(
    (row) => row.name,
  ),
  ["Sari Wangi"],
);
assert.deepEqual(getAbsensiRoleTabs(filterRows).slice(0, 3), [
  { count: 2, label: "All", shortLabel: "All", value: null },
  {
    count: 1,
    label: "Professional Player",
    shortLabel: "PP",
    value: "Professional Player",
  },
  { count: 0, label: "Expert Player", shortLabel: "EP", value: "Expert Player" },
]);
assert.ok(
  getAbsensiRoleTabs(filterRows).some(
    (tab) =>
      tab.label === "Cleaning Service" &&
      tab.shortLabel === "CL" &&
      tab.value === "Cleaning Service",
  ),
);
assert.deepEqual(
  getAbsensiRoleTabs(filterRows).map((tab) => tab.shortLabel),
  ["All", "PP", "EP", "CS", "EX", "SC", "CL", "IN"],
);

assertIncludes(pageSource, "const canCorrectAbsensi");
assertIncludes(pageSource, 'staff.profile.tier !== "member"');
assertIncludes(pageSource, "currentWibDate");
assertIncludes(pageSource, "getCurrentWibDateParam");
assertIncludes(pageSource, "AbsensiToolbar");
assertIncludes(pageSource, "parseAbsensiFilters");
assertIncludes(pageSource, "filterAbsensiRows");
assertIncludes(pageSource, "getAbsensiRoleTabs");
assertIncludes(pageSource, "hasAbsensiFilters");
assertIncludes(pageSource, "canCorrect={canCorrectAbsensi}");
assertIncludes(pageSource, "currentWibDate={currentWibDate}");
assertIncludes(pageSource, "rows={filteredRows}");
assertIncludes(pageSource, "emptyTitle={emptyTitle}");
assertIncludes(pageSource, "emptyDescription={emptyDescription}");
assertIncludes(pageSource, "getAbsensiData({ monthParam, staff })");
assertIncludes(pageSource, 'className="flex flex-col gap-6"');
assertNoPattern(
  pageSource,
  /className="flex flex-col gap-4"/,
  "Absensi toolbar-to-grid rhythm should use the larger D2-B gap-6 spacing.",
);
assertNoPattern(
  pageSource,
  /gap-2\.5/,
  "Absensi toolbar-to-grid rhythm should use the shared gap-4 page rhythm.",
);

assertIncludes(dataSource, "attendanceUpdatedAt");
assertIncludes(dataSource, "updated_at");
assertIncludes(dataSource, '.eq("is_canceled", false)');

assertIncludes(filtersSource, "export type AbsensiSearchParams");
assertIncludes(filtersSource, "export type AbsensiFilters");
assertIncludes(filtersSource, "export type AbsensiRoleTab");
assertIncludes(filtersSource, "shortLabel");
assertIncludes(filtersSource, "parseAbsensiFilters");
assertIncludes(filtersSource, "filterAbsensiRows");
assertIncludes(filtersSource, "getAbsensiRoleTabs");
assertIncludes(filtersSource, "hasAbsensiFilters");
assertIncludes(filtersSource, "isWorkerRole");
assertIncludes(filtersSource, "q.slice(0, 80)");
assertIncludes(filtersSource, "toLocaleLowerCase(\"id-ID\")");
assertIncludes(filtersSource, "row.name.toLocaleLowerCase(\"id-ID\")");
assertNoPattern(
  filtersSource,
  /row\.gid\.toLocaleLowerCase|row\.gid\.includes/,
  "Absensi search must match worker name only, not GID.",
);
assertIncludes(filtersSource, 'label: "All"');
assertIncludes(filtersSource, 'shortLabel: "All"');
assertIncludes(filtersSource, 'shortLabel: "PP"');
assertIncludes(filtersSource, 'shortLabel: "EP"');
assertIncludes(filtersSource, 'shortLabel: "CS"');
assertIncludes(filtersSource, 'shortLabel: "EX"');
assertIncludes(filtersSource, 'shortLabel: "SC"');
assertIncludes(filtersSource, 'shortLabel: "CL"');
assertIncludes(filtersSource, 'shortLabel: "IN"');

assertIncludes(helpersSource, "absensiAttendanceInitials");
assertIncludes(helpersSource, 'hadir: "H"');
assertIncludes(helpersSource, 'cuti: "C"');
assertIncludes(helpersSource, 'sakit: "S"');
assertIncludes(helpersSource, 'pending: "P"');
assertIncludes(helpersSource, 'alpha: "A"');

assert.match(gridSource, /^"use client";/);
assertIncludes(gridSource, "AbsensiCorrectionDialog");
assertIncludes(gridSource, "canCorrect");
assertIncludes(gridSource, "currentWibDate");
assertIncludes(gridSource, "emptyTitle");
assertIncludes(gridSource, "emptyDescription");
assertIncludes(gridSource, "getAbsensiDateState");
assertIncludes(gridSource, "dateState");
assertIncludes(gridSource, "data-date-state");
assertIncludes(gridSource, "getAbsensiWorkerMetaLabel");
assertIncludes(gridSource, "getAbsensiRoleShortLabel");
assertIncludes(gridSource, "row.employeeRole");
assertIncludes(gridSource, "row.shift");
assertIncludes(gridSource, 'return "past"');
assertIncludes(gridSource, 'return "today"');
assertIncludes(gridSource, 'return "future"');
assertIncludes(gridSource, "status-on");
assertIncludes(gridSource, 'const beforeStatus = cell?.status ?? "none";');
assertIncludes(gridSource, "attendanceUpdatedAt");
assertIncludes(gridSource, "expectedAttendanceId");
assertIncludes(gridSource, "expectedAttendanceUpdatedAt");
assertIncludes(gridSource, "expectedAttendanceId: null");
assertIncludes(gridSource, "expectedAttendanceUpdatedAt: null");
assertIncludes(gridSource, 'day < currentWibDate');
assertNormalizedIncludes(gridSource, "const canOpenCorrection = canCorrect && isHistorical;");
assertIncludes(gridSource, "Historical corrections only");
assertIncludes(gridSource, "absensiAttendanceInitials");
assertNoPattern(
  gridSource,
  /IdCardIcon|\{row\.gid\}/,
  "Absensi grid secondary metadata must not show KRU/GID.",
);
assertNoPattern(
  gridSource,
  /dateState === "today" && "ring-[^"]*status-on/,
  "Today column must not add green rings to individual status cells.",
);
assertNoPattern(
  gridSource,
  /cell\?\.status\s*!==\s*["']hadir["']|beforeStatus\s*===\s*["']hadir["']|HADIR correction is not available in v1/,
  "Historical HADIR cells must be correctable for Owner/Admin.",
);

assertNoPattern(
  gridSource,
  /const canOpenCorrection = canCorrect && isHistorical &&|day <= currentWibDate|day >= currentWibDate/,
  "Current/future correction gating must not be expanded.",
);

assert.match(toolbarSource, /^import Link from "next\/link";/);
assertIncludes(toolbarSource, "AbsensiToolbar");
assertIncludes(toolbarSource, "SearchIcon");
assertIncludes(toolbarSource, "ChevronLeftIcon");
assertIncludes(toolbarSource, "ChevronRightIcon");
assertIncludes(toolbarSource, "URLSearchParams");
assertIncludes(toolbarSource, 'type="search"');
assertIncludes(toolbarSource, 'name="q"');
assertIncludes(toolbarSource, 'autoComplete="off"');
assertIncludes(toolbarSource, 'name="month"');
assertIncludes(toolbarSource, 'name="role"');
assertIncludes(toolbarSource, 'aria-label="Previous Month"');
assertIncludes(toolbarSource, 'aria-label="Next Month"');
assertIncludes(toolbarSource, 'aria-label="Absensi role groups"');
assertIncludes(toolbarSource, "shortLabel");
assertIncludes(toolbarSource, "title={tab.label}");
assertIncludes(toolbarSource, "aria-label={`${tab.label}: ${tab.count} workers`}");
assertIncludes(toolbarSource, "roleTabs.map");
assertIncludes(toolbarSource, "previousMonthHref");
assertIncludes(toolbarSource, "nextMonthHref");
assertIncludes(toolbarSource, "getMonthHref");
assertIncludes(toolbarSource, "Clear Filters");
assertIncludes(toolbarSource, 'filters: { q: "", role: null }');
assertIncludes(toolbarSource, "visibleCount");
assertIncludes(toolbarSource, "readableCount");
assertIncludes(toolbarSource, "modeLabel");
assertNoPattern(
  toolbarSource,
  />Reset</,
  "Absensi toolbar should use Clear Filters as the only reset action.",
);
assertNoPattern(
  toolbarSource,
  /overflow-x-auto|min-w-max/,
  "Absensi role tabs must wrap within the toolbar width instead of horizontal overflow.",
);

assert.match(dialogSource, /^"use client";/);
assertIncludes(dialogSource, 'from "@/app/admin/(shell)/absensi/actions"');
assertIncludes(dialogSource, "applyAbsensiCorrection");
assertIncludes(dialogSource, "useTransition");
assertIncludes(dialogSource, "AbsensiCorrectionDialog");
assertIncludes(dialogSource, "Dialog");
assertIncludes(dialogSource, "Select");
assertIncludes(dialogSource, "Textarea");
assertIncludes(dialogSource, "reason.trim()");
assertIncludes(dialogSource, "const reasonLength = reason.trim().length;");
assertIncludes(dialogSource, "maxLength={20}");
assertIncludes(dialogSource, "reasonLength > 20");
assertIncludes(dialogSource, "selected.afterStatus === selected.beforeStatus");
assertIncludes(dialogSource, "window.setTimeout");
assertIncludes(dialogSource, "window.clearTimeout");
assertIncludes(dialogSource, "onOpenChange(false)");
assertIncludes(dialogSource, "1500");
assertIncludes(dialogSource, "Boolean(successMessage)");
assertIncludes(dialogSource, "border-status-on/30");
assertIncludes(dialogSource, "bg-status-on/10");
assertIncludes(dialogSource, "text-status-on");
assertIncludes(dialogSource, "shadow-status-on/10");
assertIncludes(dialogSource, "text-status-on/85");
assertIncludes(dialogSource, "expectedAttendanceId");
assertIncludes(dialogSource, "expectedAttendanceUpdatedAt");
assertNoPattern(
  dialogSource,
  /\brequired\b|Reason is required|reason\.trim\(\)\.length\s*===\s*0/,
  "Reason must be optional in the correction UI.",
);
assertNoPattern(
  dialogSource,
  /selected\.beforeStatus\s*===\s*["']hadir["']|isHadirDeferred|HADIR correction is not available in v1/,
  "The correction dialog must not block historical HADIR corrections.",
);
assertNoPattern(
  dialogSource,
  /\btoast\b|sonner|Toaster/,
  "R3D-C alignment should not add toast infrastructure.",
);

for (const status of ["hadir", "cuti", "sakit", "pending", "alpha"]) {
  assertIncludes(dialogSource, `value: "${status}"`);
}

assertNoPattern(
  dialogSource,
  /<input[^>]+(?:name|id|aria-label)=["'][^"']*status/i,
  "Correction UI must not expose a custom typed status input.",
);
assertNoPattern(
  dialogSource,
  /\b(contentEditable|prompt\s*\(|customStatus|typedStatus)\b/i,
  "Correction UI must not support custom typed statuses.",
);
assertNoPattern(
  componentSources,
  /@\/lib\/supabase|createClient|\.rpc\s*\(/,
  "Client correction UI must not import Supabase or call RPC directly.",
);
assertNoPattern(
  componentSources,
  /\b(service_role|SERVICE_ROLE|createAdminClient)\b/i,
  "Client correction UI must not use service-role/admin clients.",
);
assertNoPattern(
  componentSources,
  /\.(insert|update|upsert|delete)\s*\(/i,
  "Client correction UI must not write tables directly.",
);
assertNoPattern(
  componentSources,
  /apply_tracker_|trackerActions|trackerCorrectionActions/i,
  "Client correction UI must not call tracker actions.",
);
assertNoPattern(
  [componentSources, dataSource, actionSource].join("\n"),
  /\.from\(\s*["']worker_status["']\s*\)|worker_status\s*\.(?:insert|update|upsert|delete)/i,
  "R3D-C must not mutate live worker_status.",
);
assertNoPattern(
  uiSources,
  /\b(channel|subscribe|realtime|on\s*\(\s*["']postgres_changes["'])\b/i,
  "R3D-C correction UI must not add realtime sync.",
);
assert.equal(
  listFiles(appDir).some((filePath) =>
    /\/api\/absensi\/route\.(ts|tsx|js|jsx)$/.test(filePath),
  ),
  false,
  "R3D-C must not add an /api/absensi route handler.",
);
assertNoPattern(
  [pageSource, gridSource].join("\n"),
  /applyAbsensiCorrection/,
  "Only the dialog should call the Absensi correction Server Action from UI.",
);

assertIncludes(
  deferredRequestsSource,
  "# Absensi / Tracker Sync Deferred Requests",
);
assertIncludes(
  deferredRequestsSource,
  "Deferred / out of scope for PRD v1 and R3D-C",
);
assertIncludes(
  deferredRequestsSource,
  "Current/future Absensi cells interactive and correctable",
);
assertIncludes(
  deferredRequestsSource,
  "Absensi and Tracker should be synchronized",
);
assertIncludes(deferredRequestsSource, "Future scheduling is out of scope v1");
assertIncludes(deferredRequestsSource, "R3E / v1.x design amendment");
assertIncludes(
  prdFreezeChecklistSource,
  "absensi-tracker-sync-deferred-requests.md",
);

console.log("Absensi correction UI static tests passed.");

function assertIncludes(source: string, expected: string) {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function assertNormalizedIncludes(source: string, expected: string) {
  assert.ok(
    normalize(source).includes(normalize(expected)),
    `Expected normalized source to include: ${expected}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    return stats.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}
