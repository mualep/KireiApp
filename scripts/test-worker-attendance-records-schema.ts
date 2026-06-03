import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  workerAttendanceSources,
  workerAttendanceStatuses,
} from "../lib/workers/attendance-records";

const expectedAttendanceStatuses = ["hadir", "cuti", "sakit", "pending", "alpha"] as const;
const expectedSources = ["tracker", "absensi", "cron", "system"] as const;

assert.deepEqual(workerAttendanceStatuses, expectedAttendanceStatuses);
assert.deepEqual(workerAttendanceSources, expectedSources);

const migrationSql = readR2CAMigration();
const normalizedSql = normalizeSql(migrationSql);
const attendanceTableSql = extractCreateTableSql("worker_attendance");
const recordsTableSql = extractCreateTableSql("worker_records");
const correctionMigrationSql = readR2CCMigration();
const normalizedCorrectionSql = normalizeSql(correctionMigrationSql);

assert.match(migrationSql, /create table if not exists public\.worker_attendance/i);
assert.match(migrationSql, /create table if not exists public\.worker_records/i);

assert.deepEqual(
  parseCheckLiterals(attendanceTableSql, "worker_attendance_status_check", "status"),
  [...expectedAttendanceStatuses],
);
assert.equal(workerAttendanceStatuses.includes("late" as never), false);
assert.equal(parseCheckLiterals(attendanceTableSql, "worker_attendance_status_check", "status").includes("late"), false);

assert.deepEqual(
  parseCheckLiterals(attendanceTableSql, "worker_attendance_source_check", "source"),
  [...expectedSources],
);
assertSqlIncludes(
  "constraint worker_attendance_no_alpha_from_tracker_check check ( not ( source = 'tracker' and status = 'alpha' ) )",
);

assertSqlIncludes(
  "constraint worker_records_period_month_check check ( period_month = date_trunc('month', period_month)::date )",
);

for (const constraintName of [
  "worker_records_work_late_seconds_check",
  "worker_records_break_late_seconds_check",
  "worker_records_alpha_count_check",
  "worker_records_sakit_days_check",
  "worker_records_pending_days_check",
  "worker_records_lembur_units_check",
  "worker_records_cuti_stock_snapshot_check",
  "worker_records_work_late_override_seconds_check",
  "worker_records_break_late_override_seconds_check",
  "worker_records_alpha_override_count_check",
  "worker_records_sakit_override_days_check",
  "worker_records_pending_override_days_check",
  "worker_records_lembur_override_units_check",
  "worker_records_cuti_stock_override_snapshot_check",
]) {
  const constraintSql = extractConstraintSql(recordsTableSql, constraintName);
  assert.match(constraintSql, />= 0/);
}

for (const tableName of ["worker_attendance", "worker_records"] as const) {
  assertSqlIncludes(`alter table public.${tableName} enable row level security`);
  assertSqlIncludes(`revoke all on public.${tableName} from anon, authenticated`);
}

assertSqlIncludes("grant select, insert, update on public.worker_attendance, public.worker_records to authenticated");
assertSqlIncludes("grant select, insert, update on public.worker_attendance, public.worker_records to service_role");

assert.equal(/\bgrant\b[^;]*\bdelete\b[^;]*\bon public\.worker_(attendance|records)\b/i.test(migrationSql), false);
assert.equal(/\bfor delete\b/i.test(migrationSql), false);

assertPolicy("worker_attendance_select_self_or_admin", "worker_attendance", "select", {
  includesAdminCheck: true,
  includesSelfCheck: true,
});
assertPolicy("worker_attendance_insert_admin_only", "worker_attendance", "insert", {
  includesAdminCheck: true,
  includesSelfCheck: false,
});
assertPolicy("worker_attendance_update_admin_only", "worker_attendance", "update", {
  includesAdminCheck: true,
  includesSelfCheck: false,
  requiresUsing: true,
  requiresWithCheck: true,
});
assertPolicy("worker_records_select_self_or_admin", "worker_records", "select", {
  includesAdminCheck: true,
  includesSelfCheck: true,
});
assertPolicy("worker_records_insert_admin_only", "worker_records", "insert", {
  includesAdminCheck: true,
  includesSelfCheck: false,
});
assertPolicy("worker_records_update_admin_only", "worker_records", "update", {
  includesAdminCheck: true,
  includesSelfCheck: false,
  requiresUsing: true,
  requiresWithCheck: true,
});

assertSqlIncludes(
  "create index if not exists worker_attendance_date_status_idx on public.worker_attendance (attendance_date, status)",
);
assertSqlIncludes(
  "create index if not exists worker_records_period_month_user_id_idx on public.worker_records (period_month, user_id)",
);
assert.match(migrationSql, /set_worker_attendance_updated_at/);
assert.match(migrationSql, /set_worker_records_updated_at/);

assertCorrectionSqlIncludes(
  "alter table public.worker_attendance add column if not exists is_canceled boolean not null default false",
);
assertCorrectionSqlIncludes(
  "create table if not exists public.worker_attendance_corrections",
);
assertCorrectionSqlIncludes("alter table public.worker_attendance_corrections enable row level security");
assertCorrectionSqlIncludes(
  "revoke all on public.worker_attendance_corrections from anon, authenticated",
);
assertCorrectionSqlIncludes(
  "create or replace function app_private.apply_tracker_correction_impl",
);
assertCorrectionSqlIncludes("create or replace function public.apply_tracker_correction");
assertCorrectionSqlIncludes("security definer");
assertCorrectionSqlIncludes("set search_path = ''");
assertCorrectionSqlIncludes(
  "revoke execute on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz) from public",
);
assertCorrectionSqlIncludes(
  "revoke execute on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz) from anon",
);
assertCorrectionSqlIncludes(
  "revoke execute on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz) from authenticated",
);
assertCorrectionSqlIncludes(
  "grant execute on function public.apply_tracker_correction(uuid, text, bigint, uuid, text) to authenticated",
);
assertCorrectionSqlIncludes("where public.worker_attendance.is_canceled = true");
assert.equal(
  (
    normalizedCorrectionSql.match(
      /where public\.worker_attendance\.is_canceled = true/g,
    ) ?? []
  ).length,
  2,
  "R2C-C must patch canceled-slot revival for START and tracker absence actions.",
);
assertCorrectionSqlIncludes(
  "R2C-C could not add canceled attendance slot revival for tracker absence actions",
);
assert.equal(/\bdelete\s+from\s+public\.worker_attendance\b/i.test(correctionMigrationSql), false);
assert.equal(/\bservice_role\b/i.test(correctionMigrationSql), false);

console.log("Worker attendance/records schema tests passed.");

function readR2CAMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_2c_a_attendance_records.sql"),
  );

  assert.ok(migrationFile, "R2C-A attendance/records migration was not found.");
  return readFileSync(join(migrationsDir, migrationFile), "utf8");
}

function readR2CCMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_2c_c_tracker_corrections.sql"),
  );

  assert.ok(migrationFile, "R2C-C tracker corrections migration was not found.");
  return readFileSync(join(migrationsDir, migrationFile), "utf8");
}

function extractCreateTableSql(tableName: "worker_attendance" | "worker_records") {
  const pattern = new RegExp(
    `create table if not exists public\\.${tableName} \\([\\s\\S]*?\\n\\);`,
    "i",
  );
  const match = migrationSql.match(pattern);
  assert.ok(match, `Missing create table statement for public.${tableName}.`);
  return match[0];
}

function parseCheckLiterals(tableSql: string, constraintName: string, columnName: string) {
  const pattern = new RegExp(
    `constraint ${constraintName} check \\(\\s*${columnName} in \\(([^)]*)\\)\\s*\\)`,
    "i",
  );
  const match = tableSql.match(pattern);
  assert.ok(match, `Missing ${constraintName}.`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), ([, value]) => value);
}

function extractConstraintSql(tableSql: string, constraintName: string) {
  const pattern = new RegExp(`constraint ${constraintName} check \\([\\s\\S]*?\\)`, "i");
  const match = tableSql.match(pattern);
  assert.ok(match, `Missing ${constraintName}.`);
  return match[0];
}

function assertPolicy(
  policyName: string,
  tableName: string,
  operation: "select" | "insert" | "update",
  options: {
    includesAdminCheck: boolean;
    includesSelfCheck: boolean;
    requiresUsing?: boolean;
    requiresWithCheck?: boolean;
  },
) {
  const blockPattern = new RegExp(`create policy ${policyName}[\\s\\S]*?\\$policy\\$;`, "i");
  const match = migrationSql.match(blockPattern);
  assert.ok(match, `Missing policy ${policyName}.`);

  const block = normalizeSql(match[0]);
  assert.ok(block.includes(`on public.${tableName}`), `${policyName} must target public.${tableName}.`);
  assert.ok(block.includes(`for ${operation}`), `${policyName} must be a ${operation} policy.`);
  assert.ok(block.includes("to authenticated"), `${policyName} must target authenticated users.`);

  if (options.includesAdminCheck) {
    assert.ok(
      block.includes("(select app_private.is_admin_or_owner())"),
      `${policyName} must use the admin/owner helper.`,
    );
  }

  if (options.includesSelfCheck) {
    assert.ok(
      block.includes("((select auth.uid()) = user_id)"),
      `${policyName} must include member self-read scope.`,
    );
  }

  if (options.requiresUsing) {
    assert.ok(block.includes("using ("), `${policyName} must include a USING clause.`);
  }

  if (options.requiresWithCheck) {
    assert.ok(block.includes("with check ("), `${policyName} must include a WITH CHECK clause.`);
  }
}

function assertSqlIncludes(fragment: string) {
  assert.ok(normalizedSql.includes(normalizeSql(fragment)), `Missing SQL fragment: ${fragment}`);
}

function assertCorrectionSqlIncludes(fragment: string) {
  assert.ok(
    normalizedCorrectionSql.includes(normalizeSql(fragment)),
    `Missing R2C-C SQL fragment: ${fragment}`,
  );
}

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}
