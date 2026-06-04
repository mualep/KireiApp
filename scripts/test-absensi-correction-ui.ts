import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const absensiPagePath = resolve(projectRoot, "app/admin/(shell)/absensi/page.tsx");
const absensiActionPath = resolve(projectRoot, "app/admin/(shell)/absensi/actions.ts");
const absensiDataPath = resolve(projectRoot, "lib/absensi/data.ts");
const absensiHelpersPath = resolve(projectRoot, "lib/absensi/helpers.ts");
const absensiGridPath = resolve(
  projectRoot,
  "components/admin/absensi/absensi-month-grid.tsx",
);
const absensiDialogPath = resolve(
  projectRoot,
  "components/admin/absensi/absensi-correction-dialog.tsx",
);
const absensiComponentsDir = resolve(projectRoot, "components/admin/absensi");
const appDir = resolve(projectRoot, "app");
const packageJsonPath = resolve(projectRoot, "package.json");

for (const path of [
  absensiPagePath,
  absensiActionPath,
  absensiDataPath,
  absensiHelpersPath,
  absensiGridPath,
  absensiDialogPath,
]) {
  assert.ok(existsSync(path), `${path} must exist for R3D-C correction UI.`);
}

const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const pageSource = readFileSync(absensiPagePath, "utf8");
const actionSource = readFileSync(absensiActionPath, "utf8");
const dataSource = readFileSync(absensiDataPath, "utf8");
const helpersSource = readFileSync(absensiHelpersPath, "utf8");
const gridSource = readFileSync(absensiGridPath, "utf8");
const dialogSource = readFileSync(absensiDialogPath, "utf8");
const componentSources = listFiles(absensiComponentsDir)
  .filter((filePath) => filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");
const uiSources = [pageSource, gridSource, dialogSource].join("\n");

assertIncludes(packageJsonSource, '"test:absensi-correction-ui"');

assertIncludes(pageSource, "const canCorrectAbsensi");
assertIncludes(pageSource, 'staff.profile.tier !== "member"');
assertIncludes(pageSource, "currentWibDate");
assertIncludes(pageSource, "getCurrentWibDateParam");
assertIncludes(pageSource, "canCorrect={canCorrectAbsensi}");
assertIncludes(pageSource, "currentWibDate={currentWibDate}");

assertIncludes(dataSource, "attendanceUpdatedAt");
assertIncludes(dataSource, "updated_at");
assertIncludes(dataSource, '.eq("is_canceled", false)');

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
assertIncludes(gridSource, 'beforeStatus: "none"');
assertIncludes(gridSource, "attendanceUpdatedAt");
assertIncludes(gridSource, "expectedAttendanceId");
assertIncludes(gridSource, "expectedAttendanceUpdatedAt");
assertIncludes(gridSource, "expectedAttendanceId: null");
assertIncludes(gridSource, "expectedAttendanceUpdatedAt: null");
assertIncludes(gridSource, 'day < currentWibDate');
assertIncludes(gridSource, 'cell?.status !== "hadir"');
assertIncludes(gridSource, "Historical corrections only");
assertIncludes(gridSource, "HADIR correction is not available in v1");
assertIncludes(gridSource, "absensiAttendanceInitials");

assert.match(dialogSource, /^"use client";/);
assertIncludes(dialogSource, 'from "@/app/admin/(shell)/absensi/actions"');
assertIncludes(dialogSource, "applyAbsensiCorrection");
assertIncludes(dialogSource, "useTransition");
assertIncludes(dialogSource, "AbsensiCorrectionDialog");
assertIncludes(dialogSource, "Dialog");
assertIncludes(dialogSource, "Select");
assertIncludes(dialogSource, "Textarea");
assertIncludes(dialogSource, "reason.trim()");
assertIncludes(dialogSource, "maxLength={500}");
assertIncludes(dialogSource, "required");
assertIncludes(dialogSource, "reason.trim().length === 0");
assertIncludes(dialogSource, "selected.afterStatus === selected.beforeStatus");
assertIncludes(dialogSource, 'selected.beforeStatus === "hadir"');
assertIncludes(dialogSource, "expectedAttendanceId");
assertIncludes(dialogSource, "expectedAttendanceUpdatedAt");

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

console.log("Absensi correction UI static tests passed.");

function assertIncludes(source: string, expected: string) {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
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
