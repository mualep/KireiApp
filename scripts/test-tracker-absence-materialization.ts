import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const actionPath = resolve(projectRoot, "app/admin/(shell)/tracker/actions.ts");
const controlsPath = resolve(
  projectRoot,
  "components/admin/tracker/tracker-action-controls.tsx",
);
const dataPath = resolve(projectRoot, "lib/tracker/data.ts");
const workerTypesPath = resolve(projectRoot, "lib/workers/types.ts");
const materializationHelperPath = resolve(
  projectRoot,
  "lib/workers/tracker-absence-materialization.ts",
);
const packagePath = resolve(projectRoot, "package.json");

assert.ok(existsSync(actionPath), "Tracker server actions file must exist.");
assert.ok(existsSync(controlsPath), "Tracker controls file must exist.");
assert.ok(existsSync(dataPath), "Tracker data read model must exist.");
assert.ok(existsSync(workerTypesPath), "Worker tracker DTO types must exist.");
assert.ok(
  existsSync(materializationHelperPath),
  "R3-T2 materialization helper must exist.",
);

const actionSource = readFileSync(actionPath, "utf8");
const controlsSource = readFileSync(controlsPath, "utf8");
const dataSource = readFileSync(dataPath, "utf8");
const workerTypesSource = readFileSync(workerTypesPath, "utf8");
const helperSource = readFileSync(materializationHelperPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
  scripts?: Record<string, string>;
};

assert.equal(
  packageJson.scripts?.["test:tracker-absence-materialization"],
  "tsx scripts/test-tracker-absence-materialization.ts",
  "package.json must expose test:tracker-absence-materialization.",
);

assertIncludes(actionSource, "materializeTrackerAbsenceDays");
assertIncludes(actionSource, "materializeTrackerAbsenceDaysSchema");
assertIncludes(actionSource, "trackerAbsenceMaterializationActions");
assertIncludes(actionSource, 'supabase.rpc("materialize_tracker_absence_days"');
assertIncludes(actionSource, "p_target_user_id: parsed.data.targetUserId");
assertIncludes(actionSource, "p_expected_version: parsed.data.expectedVersion");
assertIncludes(actionSource, 'revalidatePath("/admin/tracker")');
assertIncludes(actionSource, 'revalidatePath("/admin/absensi")');
assertIncludes(actionSource, 'revalidatePath("/admin/records")');
assertIncludes(actionSource, "ApplyTrackerAbsenceMaterializationResult");
assertIncludes(actionSource, "insertedCount");
assertIncludes(actionSource, '"materialization_conflict"');
assertIncludes(actionSource, '"tracker.materialization_conflict"');

assertNoPattern(
  actionSource,
  /materializeTrackerAbsenceDays[\s\S]{0,900}apply_tracker_correction/i,
  "Materialization server action must not call the correction RPC.",
);
assertNoPattern(
  actionSource,
  /materializeTrackerAbsenceDays[\s\S]{0,900}apply_tracker_absence_close/i,
  "Materialization server action must not call the expired close RPC.",
);
assertNoPattern(
  actionSource,
  /materializeTrackerAbsenceDays[\s\S]{0,1200}\.from\(\s*["']worker_(attendance|records|profiles|status)["']\s*\)/i,
  "Materialization server action must delegate table mutation to the RPC.",
);
assertNoPattern(
  actionSource,
  /materializeTrackerAbsenceDays[\s\S]{0,1200}\.(insert|update|upsert|delete)\s*\(/i,
  "Materialization server action must not mutate tables directly.",
);

assertIncludes(helperSource, "MATERIALIZE_ABSENCE_DAYS");
assertIncludes(helperSource, "trackerAbsenceMaterializationActions");
assertIncludes(helperSource, "canStaffTierMaterializeTrackerAbsence");
assertIncludes(helperSource, "tier === \"owner\" || tier === \"admin\"");
assertIncludes(helperSource, "trackerAbsenceMaterializationStatuses");
assertIncludes(helperSource, '"cuti"');
assertIncludes(helperSource, '"sakit"');
assertIncludes(helperSource, '"pending"');
assertNoPattern(helperSource, /\b(member|Member)[\s\S]{0,80}true/i, "Member must not be allowed to materialize absence days.");

assertIncludes(controlsSource, "materializeTrackerAbsenceDays");
assertIncludes(controlsSource, 'label: "SINKRONKAN ABSENSI"');
assertIncludes(controlsSource, "absenceMaterializationAction");
assertIncludes(controlsSource, "pendingAbsenceMaterializationAction");
assertIncludes(controlsSource, "card.absenceMaterializationMissingDays");
assertIncludes(controlsSource, "card.isAbsenceMaterializationAvailable");
assertIncludes(controlsSource, "runTrackerAbsenceMaterialization");
assertIncludes(controlsSource, "MATERIALIZE_ABSENCE_DAYS");
assertNoPattern(
  controlsSource,
  /MATERIALIZE_ABSENCE_DAYS[\s\S]{0,900}applyTrackerCorrection/i,
  "Sync control must not call BATAL correction flow.",
);
assertNoPattern(
  controlsSource,
  /MATERIALIZE_ABSENCE_DAYS[\s\S]{0,900}applyTrackerExpiredAbsenceClose/i,
  "Sync control must not call expired close flow.",
);
assertNoPattern(
  controlsSource,
  /label:\s*["'](?:LEMBUR|PAUSE|RESUME)["']/,
  "Materialization must not add Lembur/Pause/Resume actions.",
);

assertIncludes(workerTypesSource, "isAbsenceMaterializationAvailable: boolean;");
assertIncludes(workerTypesSource, "absenceMaterializationMissingDays: number;");
assertIncludes(dataSource, "isAbsenceMaterializationAvailable:");
assertIncludes(dataSource, "absenceMaterializationMissingDays:");
assertIncludes(dataSource, "getTrackerAbsenceMaterializationMissingDates");
assertIncludes(dataSource, "deriveTrackerAttendanceDate");
assertIncludes(dataSource, "cuti_set_date");
assertIncludes(dataSource, "sakit_started_at");
assertIncludes(dataSource, "pending_started_at");
assertIncludes(dataSource, "is_canceled");
assertIncludes(dataSource, "source_action");
assertIncludes(dataSource, "staff.profile.tier");

console.log("Tracker absence materialization static tests passed.");

function assertIncludes(source: string, fragment: string) {
  assert.ok(
    normalize(source).includes(normalize(fragment)),
    `Missing source fragment: ${fragment}`,
  );
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
