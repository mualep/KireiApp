import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
assertIncludes(pageSource, "All visible workers");
assertIncludes(pageSource, "Read-only");
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
assertIncludes(dataSource, '.eq("show_card", true)');
assertIncludes(dataSource, '.from("users")');
assertIncludes(dataSource, "is_deleted");
assertIncludes(dataSource, '.from("worker_records")');
assertIncludes(dataSource, '.eq("period_month", month.monthStart)');
assertIncludes(dataSource, "work_late_override_seconds");
assertIncludes(dataSource, "break_late_override_seconds");
assertIncludes(dataSource, "alpha_override_count");
assertIncludes(dataSource, "sakit_override_days");
assertIncludes(dataSource, "pending_override_days");
assertIncludes(dataSource, "cuti_stock_override_snapshot");
assertIncludes(dataSource, "lembur_override_units");
assertIncludes(dataSource, "getRecordsMonthRange");

assertIncludes(filtersSource, "parseRecordsFilters");
assertIncludes(filtersSource, "filterRecordsRows");
assertIncludes(filtersSource, "getRecordsRoleTabs");
assertIncludes(helpersSource, "getRecordsMonthRange");
assertIncludes(helpersSource, "getEffectiveRecordMetric");
assertIncludes(helpersSource, "formatRecordsDuration");

assertIncludes(recordsUiSource, "Records");
assertIncludes(recordsUiSource, "Read-only");
assertIncludes(recordsUiSource, "All visible workers");
assertIncludes(recordsUiSource, "Self-only");
assertIncludes(recordsUiSource, "Selected Month");
assertIncludes(recordsUiSource, "Override");
assertIncludes(recordsUiSource, "No records available");
assertIncludes(recordsUiSource, 'aria-label="Read-only monthly worker records"');

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
  'label: "Tracker"',
  'label: "Absensi"',
  'label: "Records"',
]);

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
  /\b(Edit|Reset|Delete|Archive|Hard Delete|Access Manager|PAUSE|RESUME)\b/,
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

function assertOrderedFragments(source: string, fragments: string[]) {
  let cursor = -1;

  for (const fragment of fragments) {
    const index = source.indexOf(fragment);

    assert.notEqual(index, -1, `Missing ordered fragment: ${fragment}`);
    assert.ok(index > cursor, `Expected ${fragment} after previous fragment.`);
    cursor = index;
  }
}
