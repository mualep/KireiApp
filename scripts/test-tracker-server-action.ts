import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const actionPath = resolve(projectRoot, "app/admin/(shell)/tracker/actions.ts");
const trackerActionControlsPath = resolve(
  projectRoot,
  "components/admin/tracker/tracker-action-controls.tsx",
);
const trackerPagePath = resolve(projectRoot, "app/admin/(shell)/tracker/page.tsx");
const trackerComponentsDir = resolve(projectRoot, "components/admin/tracker");

assert.ok(existsSync(actionPath), "Tracker Server Action file must exist.");
assert.ok(
  existsSync(trackerActionControlsPath),
  "Tracker action controls must exist once R2C-B-04 activates Owner/Admin UI.",
);

const actionSource = readFileSync(actionPath, "utf8");
const trackerActionControlsSource = readFileSync(trackerActionControlsPath, "utf8");
const normalizedActionSource = normalize(actionSource);
const trackerUiSources = [
  readFileSync(trackerPagePath, "utf8"),
  ...listFiles(trackerComponentsDir)
    .filter(
      (filePath) =>
        filePath !== trackerActionControlsPath &&
        (filePath.endsWith(".tsx") || filePath.endsWith(".ts")),
    )
    .map((filePath) => readFileSync(filePath, "utf8")),
].join("\n");
const trackerAllUiSources = `${trackerUiSources}\n${trackerActionControlsSource}`;

assert.match(actionSource, /^"use server";/);
assertIncludes('from "next/cache"');
assertIncludes('from "zod"');
assertIncludes('from "@/lib/auth/staff"');
assertIncludes("getCurrentStaffUser");
assertIncludes('from "@/lib/supabase/server"');
assertIncludes("createClient");
assertIncludes('from "@/lib/workers/tracker-actions"');
assertIncludes("canStaffTierPerformTrackerAction");
assertIncludes("trackerActions");
assertIncludes("export async function applyTrackerAction(input: unknown)");
assertIncludes("export async function applyTrackerCorrection(");
assertIncludes("export async function applyTrackerExpiredAbsenceClose(");
assertIncludes("export async function materializeTrackerAbsenceDays(");
assertIncludes("export type ApplyTrackerActionInput");
assertIncludes("export type ApplyTrackerActionResult");
assertIncludes("export type ApplyTrackerAbsenceMaterializationResult");
assertIncludes("export type TrackerActionResultCode");
assertIncludes("z.enum(trackerActions)");
assertIncludes("z.enum(trackerExpiredAbsenceCloseActions)");
assertIncludes("z.enum(trackerAbsenceMaterializationActions)");
assertIncludes("targetUserId: z.string().uuid()");
assertIncludes("attendanceId: z.string().uuid().nullable()");
assertIncludes("expectedVersion: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER)");
assertIncludes('supabase.rpc("apply_tracker_action"');
assertIncludes('supabase.rpc("apply_tracker_correction"');
assertIncludes('supabase.rpc("apply_tracker_absence_close"');
assertIncludes('supabase.rpc("materialize_tracker_absence_days"');
assertIncludes("p_target_user_id: parsed.data.targetUserId");
assertIncludes("p_action: parsed.data.action");
assertIncludes("p_expected_version: parsed.data.expectedVersion");
assertIncludes("p_attendance_id: parsed.data.attendanceId");
assertIncludes('revalidatePath("/admin/absensi")');
assertIncludes('revalidatePath("/admin/records")');
assertIncludes('revalidatePath("/admin/tracker")');
assertIncludes("mapTrackerRpcError(error.message)");
assertOrderedFragments(
  "const staff = await getCurrentStaffUser();",
  "const parsed = applyTrackerActionSchema.safeParse(input);",
);

for (const code of [
  "success",
  "invalid_input",
  "unauthenticated",
  "unauthorized",
  "invalid_action",
  "invalid_target",
  "version_conflict",
  "invalid_transition",
  "alpha_rejected",
  "attendance_conflict",
  "attendance_missing",
  "absence_close_not_expired",
  "cuti_stock_exhausted",
  "materialization_conflict",
  "generic_error",
]) {
  assertIncludes(`"${code}"`);
}

for (const rpcError of [
  "tracker.unauthenticated",
  "tracker.unauthorized",
  "tracker.invalid_action",
  "tracker.invalid_target",
  "tracker.version_conflict",
  "tracker.invalid_transition",
  "tracker.alpha_rejected",
  "tracker.attendance_conflict",
  "tracker.attendance_missing",
  "tracker.absence_close_not_expired",
  "tracker.cuti_stock_exhausted",
  "tracker.materialization_conflict",
]) {
  assertIncludes(`"${rpcError}"`);
}

assertNoActionPattern(/\bservice_role\b/i, "Server Action must not use service-role strings.");
assertNoActionPattern(/@\/lib\/supabase\/admin|lib\/supabase\/admin/i, "Server Action must not import the admin Supabase client.");
assertNoActionPattern(/\.from\(\s*["']worker_status["']\s*\)/i, "Server Action must not write worker_status directly.");
assertNoActionPattern(/\.from\(\s*["']worker_attendance["']\s*\)/i, "Server Action must not write worker_attendance directly.");
assertNoActionPattern(/\.from\(\s*["']worker_records["']\s*\)/i, "Server Action must not write worker_records directly.");
assertNoActionPattern(/\.from\(\s*["']worker_profiles["']\s*\)/i, "Server Action must not update worker_profiles directly.");
assertNoActionPattern(/\.(insert|update|upsert|delete)\s*\(/i, "Server Action must delegate mutations to the RPC only.");
assertNoActionPattern(/\bmessage\s*:\s*error\.message\b/i, "Server Action must not return raw RPC error messages.");
assertNoActionPattern(/\b(details|hint|sqlstate|code)\s*:\s*error\./i, "Server Action must not expose raw database error metadata.");
assertNoActionPattern(/\bthrow\s+error\b/i, "Server Action must not throw raw RPC errors.");
assertNoPattern(
  trackerActionControlsSource,
  /\b(service_role|@\/lib\/supabase\/admin|lib\/supabase\/admin)\b/i,
  "Tracker UI controls must not use service-role or admin Supabase clients.",
);
assertNoPattern(
  trackerActionControlsSource,
  /\.from\(\s*["']worker_(status|attendance|records|profiles)["']\s*\)|\.(insert|update|upsert|delete)\s*\(/i,
  "Tracker UI controls must not write tracker tables directly.",
);
assertNoPattern(
  trackerActionControlsSource,
  /\bmessage\s*:\s*error\.message\b|\b(details|hint|sqlstate|code)\s*:\s*error\.|\bthrow\s+error\b/i,
  "Tracker UI controls must not expose raw database error metadata.",
);

assert.equal(
  listFiles(resolve(projectRoot, "app")).some((filePath) =>
    /\/api\/tracker\/route\.(ts|tsx|js|jsx)$/.test(filePath),
  ),
  false,
  "R2C-B-03 must not add an /api/tracker route handler.",
);

assert.ok(
  normalize(trackerActionControlsSource).includes(
    normalize('from "@/app/admin/(shell)/tracker/actions"'),
  ),
  "R2C-B-04 must import the tracker Server Action only from the controls component.",
);
assert.ok(
  normalize(trackerActionControlsSource).includes(normalize("applyTrackerAction({")),
  "R2C-B-04 controls must call applyTrackerAction.",
);
assert.ok(
  normalize(trackerActionControlsSource).includes(normalize("applyTrackerCorrection({")),
  "R2C-C controls must call applyTrackerCorrection.",
);
assert.ok(
  normalize(trackerActionControlsSource).includes(normalize("applyTrackerExpiredAbsenceClose({")),
  "R3-T1 controls must call applyTrackerExpiredAbsenceClose for expired operational closes.",
);
assert.ok(
  normalize(trackerActionControlsSource).includes(normalize("materializeTrackerAbsenceDays({")),
  "R3-T2 controls must call materializeTrackerAbsenceDays for explicit absence sync.",
);
assert.equal(
  /applyTrackerExpiredAbsenceClose[\s\S]{0,700}applyTrackerCorrection/.test(actionSource),
  false,
  "R3-T1 expired close action must not call applyTrackerCorrection.",
);
assert.equal(
  /applyTrackerExpiredAbsenceClose[\s\S]{0,900}apply_tracker_correction/.test(actionSource),
  false,
  "R3-T1 expired close action must not call the correction RPC.",
);
assert.equal(
  /materializeTrackerAbsenceDays[\s\S]{0,900}applyTrackerCorrection/.test(actionSource),
  false,
  "R3-T2 materialization action must not call applyTrackerCorrection.",
);
assert.equal(
  /materializeTrackerAbsenceDays[\s\S]{0,900}applyTrackerExpiredAbsenceClose/.test(actionSource),
  false,
  "R3-T2 materialization action must not call the expired close action.",
);
assert.equal(
  /materializeTrackerAbsenceDays[\s\S]{0,900}apply_tracker_correction/.test(actionSource),
  false,
  "R3-T2 materialization action must not call the correction RPC.",
);
assert.equal(
  /materializeTrackerAbsenceDays[\s\S]{0,900}apply_tracker_absence_close/.test(actionSource),
  false,
  "R3-T2 materialization action must not call the expired close RPC.",
);
assert.equal(
  /from\s+["'][^"']*tracker\/actions["']|from\s+["']\.\/actions["']|applyTrackerAction/.test(
    trackerUiSources,
  ),
  false,
  "R2C-B-04 must not import or use the tracker action outside the dedicated controls component.",
);
assert.equal(
  /\b(formAction|useActionState|handleStart|handleFinish|handleCuti|handleSakit|handlePending|handleLembur)\b/.test(
    trackerAllUiSources,
  ),
  false,
  "R2C-B-04 must not use formAction/useActionState or legacy tracker action handlers.",
);

console.log("Tracker Server Action static tests passed.");

function assertIncludes(fragment: string) {
  assert.ok(
    normalizedActionSource.includes(normalize(fragment)),
    `Missing Server Action fragment: ${fragment}`,
  );
}

function assertNoActionPattern(pattern: RegExp, message: string) {
  assert.equal(pattern.test(actionSource), false, message);
}

function assertNoPattern(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function assertOrderedFragments(first: string, second: string) {
  const firstIndex = normalizedActionSource.indexOf(normalize(first));
  const secondIndex = normalizedActionSource.indexOf(normalize(second));

  assert.notEqual(firstIndex, -1, `Missing ordered Server Action fragment: ${first}`);
  assert.notEqual(secondIndex, -1, `Missing ordered Server Action fragment: ${second}`);
  assert.ok(firstIndex < secondIndex, `Expected "${first}" before "${second}".`);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    return stats.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}
