import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  absensiAttendanceLabels,
  getAbsensiMonthRange,
} from "../lib/absensi/helpers";
import { parseAbsensiFilters } from "../lib/absensi/filters";

const projectRoot = process.cwd();
const absensiPagePath = resolve(projectRoot, "app/admin/(shell)/absensi/page.tsx");
const absensiLoadingPath = resolve(
  projectRoot,
  "app/admin/(shell)/absensi/loading.tsx",
);
const absensiErrorPath = resolve(projectRoot, "app/admin/(shell)/absensi/error.tsx");
const absensiDataPath = resolve(projectRoot, "lib/absensi/data.ts");
const absensiFiltersPath = resolve(projectRoot, "lib/absensi/filters.ts");
const absensiHelpersPath = resolve(projectRoot, "lib/absensi/helpers.ts");
const absensiComponentsDir = resolve(projectRoot, "components/admin/absensi");
const absensiMonthGridPath = resolve(
  projectRoot,
  "components/admin/absensi/absensi-month-grid.tsx",
);
const layoutPath = resolve(projectRoot, "app/admin/(shell)/layout.tsx");
const redirectsPath = resolve(projectRoot, "lib/auth/redirects.ts");

for (const path of [
  absensiPagePath,
  absensiLoadingPath,
  absensiErrorPath,
  absensiDataPath,
  absensiFiltersPath,
  absensiHelpersPath,
  absensiMonthGridPath,
]) {
  assert.ok(existsSync(path), `${path} must exist for R3A Absensi read-only.`);
}

assert.deepEqual(Object.keys(absensiAttendanceLabels), [
  "alpha",
  "cuti",
  "hadir",
  "pending",
  "sakit",
]);
assert.deepEqual(Object.values(absensiAttendanceLabels), [
  "ALPHA",
  "CUTI",
  "HADIR",
  "PENDING",
  "SAKIT",
]);

assert.deepEqual(getAbsensiMonthRange("2026-06"), {
  days: Array.from({ length: 30 }, (_, index) => `2026-06-${pad2(index + 1)}`),
  monthLabel: "June 2026",
  monthParam: "2026-06",
  monthStart: "2026-06-01",
  nextMonthStart: "2026-07-01",
  previousMonthParam: "2026-05",
  nextMonthParam: "2026-07",
});
assert.deepEqual(getAbsensiMonthRange("invalid").monthParam, getCurrentWibMonth());

const pageSource = readFileSync(absensiPagePath, "utf8");
const dataSource = readFileSync(absensiDataPath, "utf8");
const filtersSource = readFileSync(absensiFiltersPath, "utf8");
const helpersSource = readFileSync(absensiHelpersPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");
const redirectsSource = readFileSync(redirectsPath, "utf8");
const absensiMonthGridSource = readFileSync(absensiMonthGridPath, "utf8");
const absensiUiSource = [pageSource, helpersSource, ...readComponentSources()].join("\n");
const absensiAllSource = [absensiUiSource, dataSource].join("\n");

assertIncludes(pageSource, 'from "@/lib/auth/staff"');
assertIncludes(pageSource, "getCurrentStaffUser");
assertIncludes(pageSource, 'redirect("/admin/login")');
assertIncludes(pageSource, "canAccessAdminAbsensi");
assertIncludes(pageSource, "getAbsensiData");
assertIncludes(pageSource, "getAbsensiData({ monthParam, staff })");
assertIncludes(pageSource, "AbsensiMonthGrid");
assertIncludes(pageSource, "scopeLabel");
assertIncludes(pageSource, "Self-only");
assertIncludes(pageSource, "canCorrectAbsensi");
assertIncludes(pageSource, 'staff.profile.tier !== "member"');
assertNoPattern(pageSource, /All visible workers|Correction Controls|modeLabel/);
assertNoPattern(pageSource, /redirect\(["']\/admin\/profile["']\)/);
assertNoPattern(pageSource, /<h1[^>]*>\s*Absensi\s*<\/h1>/);
assertNoPattern(pageSource, /\bOwner\/Admin\b/);

assertIncludes(redirectsSource, "canAccessAdminAbsensi");
assertIncludes(redirectsSource, 'tier === "member"');
assertIncludes(layoutSource, 'href: "/admin/absensi"');
assertIncludes(layoutSource, 'label: "Absensi"');

const ownerNavIndex = layoutSource.indexOf("const ownerAdminNavItems");
const memberNavIndex = layoutSource.indexOf("const memberNavItems");
assert.ok(ownerNavIndex >= 0 && memberNavIndex > ownerNavIndex);
assert.ok(
  layoutSource.slice(ownerNavIndex, memberNavIndex).includes('href: "/admin/absensi"'),
  "Owner/Admin nav must include Absensi.",
);
assert.ok(
  layoutSource.slice(memberNavIndex).includes('href: "/admin/absensi"'),
  "Member nav must include Absensi for read-only self attendance.",
);

assertIncludes(dataSource, 'import "server-only";');
assertIncludes(dataSource, 'from "@/lib/supabase/server"');
assertIncludes(dataSource, "createClient");
assertIncludes(dataSource, "getShiftDefinition");
assertIncludes(dataSource, 'from "@/lib/auth/tiers"');
assertIncludes(dataSource, "type AbsensiDataRequest");
assertIncludes(dataSource, "compactRoleShiftLabel");
assertIncludes(dataSource, "shiftTimeLabel");
assertIncludes(dataSource, "getAbsensiRoleShiftLabel");
assertIncludes(dataSource, "getCompactAbsensiRoleShiftLabel");
assertIncludes(dataSource, "getAbsensiShiftTimeLabel");
for (const compactRoleLabel of [
  '"Professional Player": "PP"',
  '"Expert Player": "EP"',
  '"Customer Service": "CS"',
  'Explorer: "EX"',
  'Security: "SC"',
  '"Cleaning Service": "CL"',
  'Internship: "IN"',
]) {
  assertIncludes(dataSource, compactRoleLabel);
}
assertIncludes(dataSource, "staff.profile.tier");
assertIncludes(dataSource, 'staff.profile.tier === "member"');
assertIncludes(dataSource, 'staff.profile.id');
assertIncludes(dataSource, '.eq("user_id", staff.profile.id)');
assertIncludes(dataSource, '.from("worker_profiles")');
assertIncludes(dataSource, '.eq("show_card", true)');
assertIncludes(dataSource, '.from("users")');
assertIncludes(dataSource, '.from("worker_attendance")');
assertIncludes(dataSource, ".gte(\"attendance_date\", month.monthStart)");
assertIncludes(dataSource, ".lt(\"attendance_date\", month.nextMonthStart)");
assertIncludes(dataSource, '.eq("is_canceled", false)');
assertIncludes(dataSource, "is_deleted");
assertIncludes(dataSource, "getAbsensiMonthRange");
assertNoPattern(dataSource, /\.from\(\s*["']worker_records["']\s*\)/);
assertIncludes(filtersSource, "AbsensiSortOption");
assertIncludes(filtersSource, "sortAbsensiRows");
assertNoPattern(
  filtersSource,
  /row\.gid[\s\S]*includes|includes\(normalizedSearch\)[\s\S]*row\.gid/,
);
assert.deepEqual(parseAbsensiFilters({}), {
  q: "",
  role: null,
  sort: "name-asc",
});
assert.deepEqual(parseAbsensiFilters({ sort: "name-desc" }).sort, "name-desc");

assertIncludes(absensiUiSource, "Absensi");
assertIncludes(absensiUiSource, "HADIR");
assertIncludes(absensiUiSource, "CUTI");
assertIncludes(absensiUiSource, "SAKIT");
assertIncludes(absensiUiSource, "PENDING");
assertIncludes(absensiUiSource, "ALPHA");
assertIncludes(absensiUiSource, "No recorded attendance");
assertIncludes(absensiUiSource, 'aria-label="Read-only attendance month grid"');
assertIncludes(absensiUiSource, 'id="absensi-sort"');
assertIncludes(absensiUiSource, "Name &#x2192; A-Z");
assertIncludes(absensiUiSource, "Name &#x2192; Z-A");
assertIncludes(absensiUiSource, 'placeholder="Search worker name');
assertIncludes(absensiUiSource, "Previous Month");
assertIncludes(absensiUiSource, "Next Month");
assertNoPattern(absensiUiSource, /All visible workers|Correction Controls|modeLabel/);
assertNoPattern(absensiUiSource, /Search worker name or GID|placeholder=.*GID/);
assertIncludes(absensiMonthGridSource, "tracker-worker-name");
assertIncludes(absensiMonthGridSource, "tracker-role-shift-badge");
assertIncludes(absensiMonthGridSource, "row.roleShiftLabel");
assertIncludes(absensiMonthGridSource, "row.compactRoleShiftLabel");
assertIncludes(absensiMonthGridSource, "row.shiftTimeLabel");
assertIncludes(absensiMonthGridSource, "w-[14rem]");
assertIncludes(absensiMonthGridSource, "min-w-[12rem]");
assertIncludes(absensiMonthGridSource, "max-w-[16rem]");
assertNoPattern(
  absensiMonthGridSource,
  /getAbsensiWorkerMetaLabel|>\s*KRU|Search worker name or GID/,
);

assertNoPattern(absensiAllSource, /\b(use server|revalidatePath)\b/);
assertNoPattern(absensiAllSource, /\.rpc\s*\(/);
assertNoPattern(absensiAllSource, /\.(insert|update|upsert|delete)\s*\(/);
assertNoPattern(absensiAllSource, /\b(service_role|SERVICE_ROLE|createAdminClient)\b/);
assertNoPattern(absensiAllSource, /["'](?:LATE|LEMBUR|OFF|ON|BREAK)["']/);
assertNoPattern(absensiAllSource, /\bstatus\s*=\s*["']late["']/i);

console.log("Absensi read-only tests passed.");

function readComponentSources() {
  if (!existsSync(absensiComponentsDir)) {
    return [];
  }

  return readdirSync(absensiComponentsDir)
    .filter((entry) => entry.endsWith(".tsx"))
    .map((entry) => readFileSync(join(absensiComponentsDir, entry), "utf8"));
}

function getCurrentWibMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(new Date());
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function assertIncludes(source: string, expected: string) {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp) {
  assert.equal(
    pattern.test(source),
    false,
    `Source must not match forbidden pattern: ${pattern}`,
  );
}
