import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { parseRecordsFilters } from "../lib/records/filters";

const projectRoot = process.cwd();
const packageJsonPath = resolve(projectRoot, "package.json");
const recordsPagePath = resolve(projectRoot, "app/admin/(shell)/records/page.tsx");
const recordsLoadingPath = resolve(
  projectRoot,
  "app/admin/(shell)/records/loading.tsx",
);
const recordsErrorPath = resolve(projectRoot, "app/admin/(shell)/records/error.tsx");
const recordsDataPath = resolve(projectRoot, "lib/records/data.ts");
const recordsFiltersPath = resolve(projectRoot, "lib/records/filters.ts");
const recordsHelpersPath = resolve(projectRoot, "lib/records/helpers.ts");
const recordsComponentsDir = resolve(projectRoot, "components/admin/records");
const recordsSummaryCardsPath = resolve(
  projectRoot,
  "components/admin/records/records-summary-cards.tsx",
);
const recordsTablePath = resolve(
  projectRoot,
  "components/admin/records/records-table.tsx",
);
const redirectsPath = resolve(projectRoot, "lib/auth/redirects.ts");
const layoutPath = resolve(projectRoot, "app/admin/(shell)/layout.tsx");
const adminIconsPath = resolve(projectRoot, "components/admin/admin-icons.tsx");

for (const path of [
  recordsPagePath,
  recordsLoadingPath,
  recordsErrorPath,
  recordsDataPath,
  recordsFiltersPath,
  recordsHelpersPath,
  recordsComponentsDir,
  recordsSummaryCardsPath,
  recordsTablePath,
]) {
  assert.ok(existsSync(path), `${path} must exist for R3 Records read-only.`);
}

const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const pageSource = readFileSync(recordsPagePath, "utf8");
const dataSource = readFileSync(recordsDataPath, "utf8");
const filtersSource = readFileSync(recordsFiltersPath, "utf8");
const helpersSource = readFileSync(recordsHelpersPath, "utf8");
const redirectsSource = readFileSync(redirectsPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");
const adminIconsSource = readFileSync(adminIconsPath, "utf8");
const recordsSummaryCardsSource = readFileSync(recordsSummaryCardsPath, "utf8");
const recordsTableSource = readFileSync(recordsTablePath, "utf8");
const componentSources = readComponentSources().join("\n");
const recordsUiSource = [pageSource, componentSources].join("\n");
const recordsAllSource = [recordsUiSource, dataSource, filtersSource, helpersSource].join("\n");

assertIncludes(packageJsonSource, '"test:records-readonly"');

assertIncludes(pageSource, 'from "@/lib/auth/staff"');
assertIncludes(pageSource, "getCurrentStaffUser");
assertIncludes(pageSource, 'redirect("/admin/login")');
assertIncludes(pageSource, "canAccessAdminRecords");
assertIncludes(pageSource, "getRecordsData");
assertIncludes(pageSource, "getRecordsData({ monthParam, staff })");
assertIncludes(pageSource, "parseRecordsFilters");
assertIncludes(pageSource, "filterRecordsRows");
assertIncludes(pageSource, "RecordsToolbar");
assertIncludes(pageSource, "RecordsSummaryCards");
assertIncludes(pageSource, "RecordsTable");
assertIncludes(pageSource, "scopeLabel");
assertIncludes(pageSource, "Self-only");
assertNoPattern(pageSource, /All visible workers|modeLabel/);
assertNoPattern(pageSource, /redirect\(["']\/admin\/profile["']\)/);

assertIncludes(redirectsSource, "canAccessAdminRecords");
assertIncludes(redirectsSource, 'tier === "member"');

assertIncludes(dataSource, 'import "server-only";');
assertIncludes(dataSource, 'from "@/lib/supabase/server"');
assertIncludes(dataSource, "createClient");
assertIncludes(dataSource, "type RecordsDataRequest");
assertIncludes(dataSource, "staff.profile.tier");
assertIncludes(dataSource, 'staff.profile.tier === "member"');
assertIncludes(dataSource, "staff.profile.id");
assertIncludes(dataSource, '.eq("user_id", staff.profile.id)');
assertIncludes(dataSource, '.from("worker_profiles")');
assertIncludes(dataSource, ".select(\"user_id,gid,employee_role,shift,cuti_stock\")");
assertIncludes(dataSource, '.eq("show_card", true)');
assertIncludes(dataSource, "cuti_stock: number");
assertIncludes(dataSource, "profileRows.flatMap");
assertIncludes(dataSource, '.from("users")');
assertIncludes(dataSource, "is_deleted");
assertIncludes(dataSource, '.from("worker_records")');
assertIncludes(dataSource, '.eq("period_month", month.monthStart)');
assertIncludes(dataSource, "recordsByUserId");
assertIncludes(dataSource, "record ?? createEmptyRecordRow");
assertIncludes(dataSource, "createEmptyRecordRow(month.monthStart, profile.user_id, profile.cuti_stock)");
assertIncludes(dataSource, "getRecordsShiftTimeLabel");
assertIncludes(dataSource, "compactRoleShiftLabel");
assertIncludes(dataSource, "shiftTimeLabel");
assertIncludes(dataSource, "work_late_override_seconds");
assertIncludes(dataSource, "break_late_override_seconds");
assertIncludes(dataSource, "alpha_override_count");
assertIncludes(dataSource, "sakit_override_days");
assertIncludes(dataSource, "pending_override_days");
assertIncludes(dataSource, "cuti_stock_override_snapshot");
assertIncludes(dataSource, "workerRecord.cuti_stock_snapshot ?? profile.cuti_stock");
assertIncludes(dataSource, "lembur_override_units");
assertIncludes(dataSource, "getRecordsMonthRange");

assertIncludes(filtersSource, "parseRecordsFilters");
assertIncludes(filtersSource, "filterRecordsRows");
assertIncludes(filtersSource, "getRecordsRoleTabs");
assertIncludes(filtersSource, "RecordsSortOption");
assertIncludes(filtersSource, "sortRecordsRows");
assertNoPattern(
  filtersSource,
  /row\.gid[\s\S]*includes|includes\(normalizedSearch\)[\s\S]*row\.gid/,
);
assert.deepEqual(parseRecordsFilters({}), {
  q: "",
  role: null,
  sort: "name-asc",
});
assert.deepEqual(parseRecordsFilters({ sort: "name-desc" }).sort, "name-desc");
assertIncludes(helpersSource, "getRecordsMonthRange");
assertIncludes(helpersSource, "getEffectiveRecordMetric");
assertIncludes(helpersSource, "formatRecordsDuration");
assertIncludes(helpersSource, "formatRecordsSummaryDuration");

assertIncludes(recordsUiSource, "Records");
assertIncludes(recordsUiSource, "Self-only");
assertIncludes(recordsUiSource, "records-toolbar-row");
assertIncludes(recordsUiSource, "records-toolbar-controls");
assertIncludes(recordsUiSource, "records-toolbar-tabs");
assertIncludes(recordsUiSource, "month.monthLabel");
assertIncludes(recordsUiSource, "p-0");
assertIncludes(recordsUiSource, "Override");
assertIncludes(recordsUiSource, "No records available");
assertIncludes(recordsUiSource, 'aria-label="Read-only monthly worker records"');
assertIncludes(recordsUiSource, 'placeholder="Search worker name..."');
assertIncludes(recordsUiSource, 'id="records-sort"');
assertIncludes(recordsUiSource, "Name &#x2192; A-Z");
assertIncludes(recordsUiSource, "Name &#x2192; Z-A");
assertIncludes(recordsUiSource, "Previous Month");
assertIncludes(recordsUiSource, "Next Month");
assertNoPattern(recordsUiSource, /All visible workers|modeLabel|>\s*Read-only\s*<|Selected Month|CalendarDaysIcon|>\s*\{month\.monthParam\}\s*</);
assertNoPattern(componentSources, /row\.gid|KRU|Search worker name or GID/);
for (const label of [
  "Total Work Late",
  "Total Break Late",
  "Total Alpha",
  "Total Sakit",
  "Total Pending",
  "Total Lembur",
]) {
  assertIncludes(recordsSummaryCardsSource, `label: "${label}"`);
}
assert.equal(countMatches(recordsSummaryCardsSource, /label:\s*"Total /g), 6);
assertNoPattern(
  recordsSummaryCardsSource,
  /label:\s*"(?:Work Late|Break Late|Alpha|Sakit|Pending|Lembur)"/,
);
assertNoPattern(
  recordsSummaryCardsSource,
  /work-late total|break-late total|people with alpha|sakit day total|pending day total|display-only hours/,
);
assertNoPattern(componentSources, /label:\s*"Workers"|label:\s*"Absence"/);
assertIncludes(componentSources, "grid-cols-2");
assertIncludes(componentSources, "md:grid-cols-3");
assertIncludes(componentSources, "xl:grid-cols-6");
assertIncludes(componentSources, "roleShiftLabel");
assertIncludes(recordsTableSource, "tracker-worker-name");
assertIncludes(recordsTableSource, "tracker-role-shift-badge");
assertIncludes(recordsTableSource, "compactRoleShiftLabel");
assertIncludes(recordsTableSource, "shiftTimeLabel");
assertIncludes(recordsTableSource, "w-[14rem]");
assertIncludes(recordsTableSource, "min-w-[12rem]");
assertIncludes(recordsTableSource, "max-w-[16rem]");
assertNoPattern(recordsTableSource, /lastSource|lastSourceAction|>\s*Source\s*</);
assertIncludes(recordsTableSource, ">Action<");
assertIncludes(recordsTableSource, ">Edit<");
assertIncludes(recordsTableSource, "disabled");
assertIncludes(recordsTableSource, 'aria-disabled="true"');
assertNoPattern(recordsTableSource, /onClick|formAction|<form|type="submit"/);
for (const tone of [
  "workLate",
  "breakLate",
  "alpha",
  "cuti",
  "sakit",
  "pending",
  "lembur",
]) {
  assertIncludes(recordsTableSource, `tone="${tone}"`);
}
for (const colorClass of [
  "text-status-break",
  "text-status-sakit",
  "text-status-alpha",
  "text-status-cuti",
  "text-status-pending",
]) {
  assertIncludes(recordsTableSource, colorClass);
}
assertIncludes(recordsTableSource, "font-sans");
assertIncludes(recordsSummaryCardsSource, "font-sans");
assertIncludes(recordsTableSource, 'className="px-3 py-2 text-center"');
assertIncludes(recordsTableSource, "justify-center");

assertIncludes(layoutSource, 'href: "/admin/records"');
assertIncludes(layoutSource, 'label: "Records"');
assertIncludes(adminIconsSource, '"records"');
assertIncludes(adminIconsSource, "ClipboardListIcon");
assertIncludes(adminIconsSource, "records: ClipboardListIcon");

const ownerNavSource = getBetween(
  layoutSource,
  "const ownerAdminNavItems",
  "const memberNavItems",
);
const memberNavSource = layoutSource.slice(layoutSource.indexOf("const memberNavItems"));
assertOrderedFragments(ownerNavSource, [
  'label: "Dashboard"',
  'label: "Tracker"',
  'label: "Absensi"',
  'label: "Records"',
  'label: "Content"',
]);
assertOrderedFragments(memberNavSource, [
  'label: "Profile"',
  'label: "Performance"',
]);
assertNoPattern(
  memberNavSource,
  /href:\s*["']\/admin\/records["']|label:\s*["']Records["']/,
);

assertNoPattern(
  recordsAllSource,
  /\b(use server|revalidatePath)\b|\.rpc\s*\(|\.(insert|update|upsert|delete)\s*\(/,
);
assertNoPattern(
  recordsAllSource,
  /\b(service_role|SERVICE_ROLE|createAdminClient|applyTrackerAction|applyAbsensiCorrection)\b/,
);
assertNoPattern(
  recordsAllSource,
  /\b(Reset|Delete|Archive|Hard Delete|Access Manager|PAUSE|RESUME)\b/,
);
assertNoPattern(
  recordsAllSource,
  /action:\s*["'](LEMBUR|PAUSE|RESUME|PENDING)["']|label:\s*["'](?:LEMBUR|PAUSE|RESUME)["']/,
);
assertNoPattern(
  recordsAllSource,
  /\bstatus\s*=\s*["']late["']|attendance\s*=\s*["']alpha["']|from\(\s*["']worker_status["']\s*\)/i,
);

console.log("Records read-only tests passed.");

function readComponentSources() {
  if (!existsSync(recordsComponentsDir)) {
    return [];
  }

  return readdirSync(recordsComponentsDir)
    .filter((entry) => entry.endsWith(".tsx"))
    .map((entry) => readFileSync(join(recordsComponentsDir, entry), "utf8"));
}

function getBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);

  assert.ok(startIndex >= 0, `Missing source start: ${start}`);
  assert.ok(endIndex > startIndex, `Missing source end after start: ${end}`);

  return source.slice(startIndex, endIndex);
}

function assertIncludes(source: string, expected: string) {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function assertNoPattern(source: string, pattern: RegExp) {
  assert.equal(
    pattern.test(source),
    false,
    `Source must not match forbidden pattern: ${pattern}`,
  );
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function assertOrderedFragments(source: string, fragments: string[]) {
  let cursor = -1;

  for (const fragment of fragments) {
    const index = source.indexOf(fragment);

    assert.notEqual(index, -1, `Missing ordered fragment: ${fragment}`);
    assert.ok(index > cursor, `Expected ${fragment} after previous fragment.`);
    cursor = index;
  }
}
