import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const truthTablePath = resolve(
  projectRoot,
  "docs/plans/release-3c-absensi-correction-truth-table.md",
);
const contractPath = resolve(
  projectRoot,
  "docs/plans/release-3b-absensi-correction-contract.md",
);
const absensiPagePath = resolve(projectRoot, "app/admin/(shell)/absensi/page.tsx");
const absensiDataPath = resolve(projectRoot, "lib/absensi/data.ts");
const absensiHelpersPath = resolve(projectRoot, "lib/absensi/helpers.ts");
const absensiComponentsDir = resolve(projectRoot, "components/admin/absensi");
const packageJsonPath = resolve(projectRoot, "package.json");
const migrationsDir = resolve(projectRoot, "supabase/migrations");

assert.ok(existsSync(truthTablePath), "R3C Absensi correction truth table must exist.");
assert.ok(existsSync(contractPath), "R3B Absensi correction contract must remain present.");

const truthTableSource = readFileSync(truthTablePath, "utf8");
const contractSource = readFileSync(contractPath, "utf8");
const packageJsonSource = readFileSync(packageJsonPath, "utf8");
const absensiSources = [
  readFileSync(absensiPagePath, "utf8"),
  readFileSync(absensiDataPath, "utf8"),
  readFileSync(absensiHelpersPath, "utf8"),
  ...readComponentSources(),
].join("\n");
const migrationSources = readMigrationSources();

assertIncludes(packageJsonSource, '"test:absensi-correction-truth-table"');
assertIncludes(contractSource, "Release 3B prepares the future Absensi/Admin correction flow");

for (const required of [
  "R3A Absensi remains read-only",
  "No correction UI, RPC, Server Action, migration, or mutation path is introduced in this release",
  "PRD v1 remains frozen",
  "Owner and Admin are the only future actors allowed to correct Absensi attendance",
  "Member remains self-only and read-only for Absensi",
  "Future correction is historical-day-only: `attendance_date < current WIB date`",
  "Current-day and future-date corrections are out of scope for the first DB/RPC slice",
  "Hidden workers, missing worker profiles, inactive profiles represented by `show_card = false`, and deleted users must be rejected",
  "Authenticated Customer remains out of PRD v1",
  "This is a visual display contract only",
  "| None | `-` |",
  "| Hadir | `H` |",
  "| Cuti | `C` |",
  "| Sakit | `S` |",
  "| Pending | `P` |",
  "| Alpha | `A` |",
  "The display initials must not create extra stored statuses",
  "The display initials must not change R3A read-only behavior yet",
  "Allowed controlled vocabulary for v1",
  "`none`",
  "`hadir`",
  "`cuti`",
  "`sakit`",
  "`pending`",
  "`alpha`",
  "Custom typed Absensi statuses are out of scope v1",
  "v1 uses controlled status vocabulary only",
  "Custom labels make records deltas, reporting, audit, and correction reversal non-deterministic",
  "| `none` | `hadir` |",
  "| `none` | `cuti` |",
  "| `none` | `sakit` |",
  "| `none` | `pending` |",
  "| `none` | `alpha` |",
  "| `cuti` | `hadir` |",
  "| `cuti` | `sakit` |",
  "| `cuti` | `pending` |",
  "| `cuti` | `alpha` |",
  "| `sakit` | `hadir` |",
  "| `sakit` | `cuti` |",
  "| `sakit` | `pending` |",
  "| `sakit` | `alpha` |",
  "| `pending` | `hadir` |",
  "| `pending` | `cuti` |",
  "| `pending` | `sakit` |",
  "| `pending` | `alpha` |",
  "| `alpha` | `hadir` |",
  "| `alpha` | `cuti` |",
  "| `alpha` | `sakit` |",
  "| `alpha` | `pending` |",
  "Same-status no-op is rejected",
  "`alpha` is a controlled Absensi/Admin correction status",
  "`alpha` is set manually from Absensi/Admin, not from Tracker",
  "Active `hadir -> cuti`, `hadir -> sakit`, `hadir -> pending`, and `hadir -> alpha` are deferred",
  "Tracker must not create, correct, or recover `alpha`",
  "Realtime synchronization between Absensi correction and live Tracker state is out of scope v1",
  "Future Tracker displays may derive historical ALPHA/absence display from `worker_attendance` where appropriate",
  "Absensi correction must not mutate live `worker_status` and must not require realtime sync in v1",
  "`LATE` is derived-only and must never be stored as an attendance status",
  "Canceled rows count as no active row and may be revived",
  "Tracker-origin active `cuti`, `sakit`, and `pending` rows may be corrected only for historical dates",
  "Tracker-origin active `hadir` rows are deferred from the first Absensi correction mutation slice",
  "Future corrected rows must use `source = 'absensi'`",
  "Future corrected rows must use `source_action = 'absensi.correct_<status>'`",
  "Rows must not be physically deleted",
  "deltas as `after contribution - before contribution`",
  "Entering `cuti` applies `cuti_stock_delta = -1`",
  "Leaving `cuti` applies `cuti_stock_delta = +1`",
  "Entering `sakit` applies `sakit_days_delta = +1`",
  "Leaving `sakit` applies `sakit_days_delta = -1`",
  "Entering `pending` applies `pending_days_delta = +1`",
  "Leaving `pending` applies `pending_days_delta = -1`",
  "Entering `alpha` applies `alpha_count_delta = +1`",
  "Leaving `alpha` applies `alpha_count_delta = -1`",
  "`alpha` does not touch `worker_records.work_late_seconds`",
  "`alpha` does not touch `worker_records.break_late_seconds`",
  "`alpha` does not touch `worker_records.lembur_units`",
  "`alpha` does not touch override fields",
  "`alpha` does not touch live `worker_status`",
  "`cuti_stock_snapshot` becomes the post-mutation `worker_profiles.cuti_stock`",
  "must fail closed if it must reverse an existing side effect but the monthly `worker_records` row is missing",
  "must not modify `worker_records.work_late_seconds`",
  "must not modify `worker_records.break_late_seconds`",
  "must not modify `worker_records.lembur_units`",
  "Override fields in `worker_records` must not be overwritten blindly",
  "`worker_status` must not be mutated by the first Absensi correction foundation",
  "Audit must be written in the same transaction",
  "Audit failure must fail closed",
  "public.apply_absensi_correction(",
  "p_target_user_id uuid",
  "p_attendance_date date",
  "p_before_status text",
  "p_after_status text",
  "p_expected_attendance_id uuid",
  "p_expected_attendance_updated_at timestamptz",
  "p_reason text",
  "app_private.apply_absensi_correction_impl(",
  "p_actor_user_id uuid",
  "p_now timestamptz",
  "Public wrapper reads actor from `auth.uid()`",
  "Both functions should use `SECURITY DEFINER` and `set search_path = ''`",
  "Private implementation must not be executable by `authenticated`",
  "No dynamic SQL",
  "No service-role or admin Supabase client in app code",
  "RLS remains restrictive for direct table access",
  "If `p_before_status = 'none'`, then `p_expected_attendance_id` and `p_expected_attendance_updated_at` must be null",
  "Re-running the same correction after success must fail as a state conflict",
  "No Server Action in R3C",
  "No RPC mutation in R3C",
  "No schema or migration in R3C",
  "No `worker_records` query from the read-only Absensi grid",
  "Realtime sync is deferred from v1",
  "Custom typed Absensi statuses are deferred from v1",
]) {
  assertIncludes(truthTableSource, required);
}

assertNoPattern(truthTableSource, /\bTODO\b|\bTBD\b/i);

for (const forbiddenTransition of [
  "| `hadir` | `cuti` |",
  "| `hadir` | `sakit` |",
  "| `hadir` | `pending` |",
  "| `hadir` | `alpha` |",
]) {
  assert.equal(
    truthTableSource.includes(forbiddenTransition),
    false,
    `Forbidden transition must not appear as an allowed row: ${forbiddenTransition}`,
  );
}

assertNoPattern(absensiSources, /\b(use server|revalidatePath)\b/);
assertNoPattern(absensiSources, /\.rpc\s*\(/);
assertNoPattern(absensiSources, /\.(insert|update|upsert|delete)\s*\(/);
assertNoPattern(absensiSources, /\b(service_role|SERVICE_ROLE|createAdminClient)\b/);
assertNoPattern(absensiSources, /\b(BATAL|Correction|Koreksi|Edit|Save|Reset)\b/i);

assertNoPattern(
  migrationSources,
  /\bapply_absensi_correction\b|\babsensi\.correct_|\bcreate\s+table\s+if\s+not\s+exists\s+public\.absensi/i,
);

console.log("Absensi correction truth-table tests passed.");

function readComponentSources() {
  if (!existsSync(absensiComponentsDir)) {
    return [];
  }

  return readdirSync(absensiComponentsDir)
    .filter((entry) => entry.endsWith(".tsx"))
    .map((entry) => readFileSync(join(absensiComponentsDir, entry), "utf8"));
}

function readMigrationSources() {
  return readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".sql"))
    .map((entry) => readFileSync(join(migrationsDir, entry), "utf8"))
    .join("\n");
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
