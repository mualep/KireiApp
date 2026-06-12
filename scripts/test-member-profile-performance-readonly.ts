import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const packageJsonPath = resolve(projectRoot, "package.json");
const layoutPath = resolve(projectRoot, "app/admin/(shell)/layout.tsx");
const adminIconsPath = resolve(projectRoot, "components/admin/admin-icons.tsx");
const profilePagePath = resolve(projectRoot, "app/admin/(shell)/profile/page.tsx");
const performancePagePath = resolve(
  projectRoot,
  "app/admin/(shell)/performance/page.tsx",
);
const performanceLoadingPath = resolve(
  projectRoot,
  "app/admin/(shell)/performance/loading.tsx",
);
const performanceErrorPath = resolve(
  projectRoot,
  "app/admin/(shell)/performance/error.tsx",
);
const memberProfileDataPath = resolve(projectRoot, "lib/member-profile/data.ts");

for (const path of [
  packageJsonPath,
  layoutPath,
  adminIconsPath,
  profilePagePath,
  performancePagePath,
  performanceLoadingPath,
  performanceErrorPath,
  memberProfileDataPath,
]) {
  assert.ok(existsSync(path), `${path} must exist for R3-M1.`);
}

const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const layoutSource = readFileSync(layoutPath, "utf8");
const adminIconsSource = readFileSync(adminIconsPath, "utf8");
const profilePageSource = readFileSync(profilePagePath, "utf8");
const performancePageSource = readFileSync(performancePagePath, "utf8");
const performanceErrorSource = readFileSync(performanceErrorPath, "utf8");
const memberProfileDataSource = readFileSync(memberProfileDataPath, "utf8");
const combinedSource = [
  layoutSource,
  adminIconsSource,
  profilePageSource,
  performancePageSource,
  performanceErrorSource,
  memberProfileDataSource,
].join("\n");

assertIncludes(packageJsonSource, '"test:member-profile-performance-readonly"');

assertIncludes(adminIconsSource, '"performance"');
assertIncludes(adminIconsSource, "performance:");

const ownerNavSource = getBetween(
  layoutSource,
  "const ownerAdminNavItems",
  "const memberNavItems",
);
const memberNavSource = getBetween(
  layoutSource,
  "const memberNavItems",
  "const dateFormatter",
);

assertOrderedFragments(ownerNavSource, [
  'label: "Dashboard"',
  'label: "Tracker"',
  'label: "Absensi"',
  'label: "Records"',
  'label: "Content"',
]);
assertOrderedFragments(memberNavSource, [
  'href: "/admin/profile"',
  'label: "Profile"',
  'href: "/admin/performance"',
  'label: "Performance"',
]);
assertNoPattern(
  memberNavSource,
  /href:\s*["']\/admin\/(?:dashboard|tracker|absensi|records|content)["']|label:\s*["'](?:Dashboard|Tracker|Absensi|Records|Content)["']/,
  "Member sidebar must expose only Profile and Performance.",
);

assertIncludes(profilePageSource, "getCurrentStaffUser");
assertIncludes(profilePageSource, "getMemberProfileData");
assertIncludes(profilePageSource, "Read-only");
assertIncludes(profilePageSource, "Self-only");
assertIncludes(profilePageSource, "staff.profile.id");
assertNoPattern(
  profilePageSource,
  /Release 1 Placeholder|editable profile UI is\s+deferred/i,
  "Profile must no longer be placeholder copy.",
);

assertIncludes(memberProfileDataSource, 'import "server-only";');
assertIncludes(memberProfileDataSource, 'from "@/lib/supabase/server"');
assertIncludes(memberProfileDataSource, "createClient");
assertIncludes(memberProfileDataSource, "staff.profile.id");
assertIncludes(memberProfileDataSource, '.eq("user_id", staff.profile.id)');
assertIncludes(memberProfileDataSource, ".maybeSingle()");
assertIncludes(memberProfileDataSource, "cuti_stock");
assertIncludes(memberProfileDataSource, "employee_role");
assertIncludes(memberProfileDataSource, "shift");

assertIncludes(performancePageSource, "getCurrentStaffUser");
assertIncludes(performancePageSource, "canAccessAdminPerformance");
assertIncludes(performancePageSource, "Performance");
assertIncludes(performancePageSource, "read-only");
assertIncludes(performancePageSource, "Tracker");
assertIncludes(performancePageSource, "Absensi");
assertIncludes(performancePageSource, "Records");
for (const label of ["Today", "Attendance", "Monthly Records", "Cuti"]) {
  assertIncludes(performancePageSource, label);
}
assertNoPattern(
  performancePageSource,
  /getTrackerData|getAbsensiData|getRecordsData|\.from\(\s*["']worker_/,
  "Performance shell must not compose Tracker, Absensi, or Records data yet.",
);
assertNoPattern(
  performancePageSource,
  /<form|formAction|type=["']submit["']|onClick=|useActionState|useTransition/,
  "Performance shell must not expose mutation controls.",
);

assertNoPattern(
  combinedSource,
  /\b(use server|revalidatePath)\b|\.rpc\s*\(|\.(insert|update|upsert|delete)\s*\(/,
  "R3-M1 must not add server actions, RPC, or mutations.",
);
assertNoPattern(
  combinedSource,
  /\b(service_role|SERVICE_ROLE|createAdminClient)\b/,
  "R3-M1 must not use privileged Supabase clients.",
);
assertNoPattern(
  combinedSource,
  /\b(Edit Profile|Change Password|Password|Save|Submit|Reset|Delete|Archive|Hard Delete|Access Manager|Customer Account|Customer Portal|PAUSE|RESUME)\b/,
  "R3-M1 must not add profile mutation, customer, access manager, or unsupported action UI.",
);
assertNoPattern(
  combinedSource,
  /action:\s*["'](?:LEMBUR|PAUSE|RESUME)["']|label:\s*["'](?:LEMBUR|PAUSE|RESUME)["']/,
  "R3-M1 must not add Lembur/Pause/Resume actions.",
);

console.log("Member profile/performance read-only tests passed.");

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

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function assertOrderedFragments(source: string, fragments: string[]) {
  let cursor = -1;

  for (const fragment of fragments) {
    const index = source.indexOf(fragment);

    assert.notEqual(index, -1, `Missing ordered fragment: ${fragment}`);
    assert.ok(index > cursor, `Expected ${fragment} after previous item.`);
    cursor = index;
  }
}
