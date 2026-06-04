import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const expectedPublicSignature =
  "public.apply_absensi_correction(p_target_user_id uuid, p_attendance_date date, p_before_status text, p_after_status text, p_expected_attendance_id uuid, p_expected_attendance_updated_at timestamptz, p_reason text)";
const expectedPrivateSignature =
  "app_private.apply_absensi_correction_impl(p_actor_user_id uuid, p_target_user_id uuid, p_attendance_date date, p_before_status text, p_after_status text, p_expected_attendance_id uuid, p_expected_attendance_updated_at timestamptz, p_reason text, p_now timestamptz)";

const migrationSql = readR3DAMigration();
const normalizedSql = normalizeSql(migrationSql);
const ledgerSql = extractCreateTableSql("worker_absensi_corrections");
const publicFunctionSql = extractFunctionSql("public.apply_absensi_correction");
const privateFunctionSql = extractFunctionSql("app_private.apply_absensi_correction_impl");

assertSqlIncludes("create table if not exists public.worker_absensi_corrections");
assertSqlIncludes("attendance_id uuid not null references public.worker_attendance(id)");
assertSqlIncludes("target_user_id uuid not null references public.users(id)");
assertSqlIncludes("actor_user_id uuid not null references public.users(id)");
assertSqlIncludes("attendance_date date not null");
assertSqlIncludes("before_status text not null");
assertSqlIncludes("after_status text not null");
assertSqlIncludes("before_source text");
assertSqlIncludes("before_source_action text");
assertSqlIncludes("after_source text not null default 'absensi'");
assertSqlIncludes("after_source_action text not null");
assertSqlIncludes("before_attendance_is_canceled boolean not null default false");
assertSqlIncludes("pending_days_delta integer not null default 0");
assertSqlIncludes("sakit_days_delta integer not null default 0");
assertSqlIncludes("alpha_count_delta integer not null default 0");
assertSqlIncludes("cuti_stock_delta integer not null default 0");
assertSqlIncludes("cuti_stock_before smallint");
assertSqlIncludes("cuti_stock_after smallint");
assertSqlIncludes("reason text not null");

for (const status of ["none", "hadir", "cuti", "sakit", "pending", "alpha"]) {
  assert.ok(ledgerSql.includes(`'${status}'`), `Ledger must include controlled status: ${status}`);
}

for (const action of [
  "absensi.correct_hadir",
  "absensi.correct_cuti",
  "absensi.correct_sakit",
  "absensi.correct_pending",
  "absensi.correct_alpha",
]) {
  assert.ok(ledgerSql.includes(`'${action}'`), `Ledger must constrain source action: ${action}`);
}

assertSqlIncludes("before_status <> after_status");
assertSqlIncludes("before_status <> 'hadir'");
assertSqlIncludes("after_source = 'absensi'");
assertSqlIncludes("char_length(pg_catalog.btrim(reason)) between 1 and 500");
assertSqlIncludes("cuti_stock_before is null or cuti_stock_before >= 0");
assertSqlIncludes("cuti_stock_after is null or cuti_stock_after >= 0");

for (const fragment of [
  "before_status = 'none' and after_status in ('hadir', 'cuti', 'sakit', 'pending', 'alpha')",
  "before_status = 'cuti' and after_status in ('hadir', 'sakit', 'pending', 'alpha')",
  "before_status = 'sakit' and after_status in ('hadir', 'cuti', 'pending', 'alpha')",
  "before_status = 'pending' and after_status in ('hadir', 'cuti', 'sakit', 'alpha')",
  "before_status = 'alpha' and after_status in ('hadir', 'cuti', 'sakit', 'pending')",
]) {
  assertSqlIncludes(fragment);
}

assertSqlIncludes(
  "create index if not exists worker_absensi_corrections_attendance_id_idx on public.worker_absensi_corrections (attendance_id)",
);
assertSqlIncludes(
  "create index if not exists worker_absensi_corrections_target_date_idx on public.worker_absensi_corrections (target_user_id, attendance_date desc)",
);
assertSqlIncludes(
  "create index if not exists worker_absensi_corrections_actor_created_idx on public.worker_absensi_corrections (actor_user_id, created_at desc)",
);
assertSqlIncludes("alter table public.worker_absensi_corrections enable row level security");
assertSqlIncludes("revoke all on public.worker_absensi_corrections from anon, authenticated");
assertSqlIncludes("grant select on public.worker_absensi_corrections to authenticated");
assertSqlIncludes("create policy worker_absensi_corrections_select_admin_only");
assertSqlIncludes("using ((select app_private.is_admin_or_owner()))");

assertFunctionShape(publicFunctionSql, expectedPublicSignature);
assertFunctionShape(privateFunctionSql, expectedPrivateSignature);

assertSqlIncludes(
  "revoke execute on function public.apply_absensi_correction(uuid, date, text, text, uuid, timestamptz, text) from public",
);
assertSqlIncludes(
  "revoke execute on function public.apply_absensi_correction(uuid, date, text, text, uuid, timestamptz, text) from anon",
);
assertSqlIncludes(
  "grant execute on function public.apply_absensi_correction(uuid, date, text, text, uuid, timestamptz, text) to authenticated",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_absensi_correction_impl(uuid, uuid, date, text, text, uuid, timestamptz, text, timestamptz) from public",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_absensi_correction_impl(uuid, uuid, date, text, text, uuid, timestamptz, text, timestamptz) from anon",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_absensi_correction_impl(uuid, uuid, date, text, text, uuid, timestamptz, text, timestamptz) from authenticated",
);

for (const fragment of [
  "auth.uid()",
  "absensi.unauthenticated",
  "absensi.unauthorized",
  "absensi.invalid_input",
  "absensi.invalid_target",
  "absensi.invalid_date",
  "absensi.invalid_transition",
  "absensi.attendance_conflict",
  "absensi.cuti_stock_exhausted",
  "absensi.records_missing",
  "u.tier in ('owner', 'admin')",
  "u.is_deleted = false",
  "wp.show_card = true",
  "v_current_wib_date := (p_now at time zone 'Asia/Jakarta')::date",
  "p_attendance_date >= v_current_wib_date",
  "for update",
  "source = 'absensi'",
  "source_action = v_after_source_action",
  "is_canceled = false",
  "v_pending_days_delta",
  "v_sakit_days_delta",
  "v_alpha_count_delta",
  "v_cuti_stock_delta",
  "cuti_stock = v_cuti_stock_after",
  "alpha_count = wr.alpha_count + v_alpha_count_delta",
  "sakit_days = wr.sakit_days + v_sakit_days_delta",
  "pending_days = wr.pending_days + v_pending_days_delta",
  "last_source = 'absensi'",
  "last_source_action = v_after_source_action",
  "app_private.write_audit_log(",
  "'absensi'",
  "'absensi.correct'",
  "'worker_attendance'",
  "'correction_id', v_correction_id",
  "'alpha_count_delta', v_alpha_count_delta",
  "'audit_id', v_audit_id",
]) {
  assertSqlIncludes(fragment);
}

assertNoForbiddenPattern(/\bexecute\s+v_/i, "R3D-A must not use dynamic SQL.");
assertNoForbiddenPattern(/\bservice_role\b/i, "R3D-A migration must not mention service role.");
assertNoForbiddenPattern(
  /\bupdate\s+public\.worker_status\b|\binsert\s+into\s+public\.worker_status\b|\bdelete\s+from\s+public\.worker_status\b/i,
  "Absensi correction must not mutate live worker_status.",
);
assertNoForbiddenPattern(
  /\b(current_status|status)\s*=\s*'late'\b|\bstatus\s*=\s*'late'\b/i,
  "R3D-A must not store LATE values.",
);
assertNoForbiddenPattern(
  /\bsource\s*=\s*'tracker'[\s\S]{0,220}\bstatus\s*=\s*'alpha'\b|\bstatus\s*=\s*'alpha'[\s\S]{0,220}\bsource\s*=\s*'tracker'\b/i,
  "R3D-A must not create tracker-sourced ALPHA.",
);
assertNoForbiddenPattern(
  /\bexception\s+when\b/i,
  "R3D-A must not catch or suppress audit failures.",
);

console.log("Absensi correction RPC migration static tests passed.");

function readR3DAMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_3d_a_absensi_correction_rpc.sql"),
  );

  assert.ok(migrationFile, "R3D-A Absensi correction RPC migration not found.");
  return readFileSync(join(migrationsDir, migrationFile), "utf8");
}

function extractCreateTableSql(tableName: string) {
  const pattern = new RegExp(
    `create table if not exists public\\.${tableName} \\([\\s\\S]*?\\n\\);`,
    "i",
  );
  const match = migrationSql.match(pattern);
  assert.ok(match, `Missing create table statement for public.${tableName}.`);
  return normalizeSql(match[0]);
}

function extractFunctionSql(functionName: string) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${escapeRegExp(functionName)}\\s*\\([\\s\\S]*?\\n\\$\\$;`,
    "i",
  );
  const match = migrationSql.match(pattern);

  assert.ok(match, `Missing function body for ${functionName}.`);
  return match[0];
}

function assertFunctionShape(functionSql: string, expectedSignature: string) {
  const normalizedFunction = normalizeSql(functionSql);

  assert.ok(
    normalizedFunction.includes(normalizeSql(`create or replace function ${expectedSignature}`)),
    `Missing exact function signature: ${expectedSignature}`,
  );
  assert.ok(normalizedFunction.includes("returns jsonb"), `${expectedSignature} must return jsonb.`);
  assert.ok(
    normalizedFunction.includes("language plpgsql"),
    `${expectedSignature} must use language plpgsql.`,
  );
  assert.ok(
    normalizedFunction.includes("security definer"),
    `${expectedSignature} must be SECURITY DEFINER.`,
  );
  assert.ok(
    normalizedFunction.includes("set search_path = ''"),
    `${expectedSignature} must set an empty search_path.`,
  );
}

function assertSqlIncludes(fragment: string) {
  assert.ok(normalizedSql.includes(normalizeSql(fragment)), `Missing SQL fragment: ${fragment}`);
}

function assertNoForbiddenPattern(pattern: RegExp, message: string) {
  assert.equal(pattern.test(migrationSql), false, message);
}

function normalizeSql(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
