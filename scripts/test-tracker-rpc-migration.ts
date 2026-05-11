import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const expectedPublicSignature =
  "public.apply_tracker_action(p_target_user_id uuid, p_action text, p_expected_version bigint)";
const expectedPrivateSignature =
  "app_private.apply_tracker_action_impl(p_actor_user_id uuid, p_target_user_id uuid, p_action text, p_expected_version bigint, p_now timestamptz)";

const migrationSql = readR2CBMigration();
const normalizedSql = normalizeSql(migrationSql);
const publicFunctionSql = extractFunctionSql("public.apply_tracker_action");
const privateFunctionSql = extractFunctionSql("app_private.apply_tracker_action_impl");

assertFunctionShape(publicFunctionSql, expectedPublicSignature);
assertFunctionShape(privateFunctionSql, expectedPrivateSignature);

assertSqlIncludes(
  "revoke execute on function public.apply_tracker_action(uuid, text, bigint) from public",
);
assertSqlIncludes(
  "revoke execute on function public.apply_tracker_action(uuid, text, bigint) from anon",
);
assertSqlIncludes(
  "grant execute on function public.apply_tracker_action(uuid, text, bigint) to authenticated",
);

assertSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated",
);

assert.equal(
  /\bgrant\s+update\s+on\s+public\.worker_status\s+to\s+authenticated\b/i.test(
    migrationSql,
  ),
  false,
  "R2C-B must not grant direct worker_status UPDATE to authenticated.",
);

assertNoForbiddenPattern(
  /\bcurrent_status\s*=\s*'late'\b|\bstatus\s*=\s*'late'\b/i,
  "R2C-B must not write stored LATE values.",
);
assertNoForbiddenPattern(
  /\bsource\s*=\s*'tracker'[\s\S]{0,220}\bstatus\s*=\s*'alpha'\b|\bstatus\s*=\s*'alpha'[\s\S]{0,220}\bsource\s*=\s*'tracker'\b/i,
  "R2C-B must not write tracker-sourced ALPHA.",
);
assertNoForbiddenPattern(/\/api\/tracker/i, "R2C-B-02 must not add /api/tracker.");
assertNoForbiddenPattern(/['"]use server['"]/i, "R2C-B-02 must not add Server Actions.");
assertNoForbiddenPattern(/\bservice_role\b/i, "R2C-B-02 must not use service role strings.");
assertNoForbiddenPattern(
  /\b(formAction|useActionState|handleStart|handleFinish|handleCuti|handleSakit|handlePending|handleLembur)\b/i,
  "R2C-B-02 must not activate tracker UI controls.",
);
assertNoForbiddenPattern(
  /\b(pg_cron|cron\.schedule|reset_tracker|cancel_tracker|p_action\s*=\s*'LEMBUR'|'LEMBUR'\s*,\s*'lembur')\b/i,
  "R2C-B-02 baseline excludes cron/reset/cancel/lembur automation.",
);

assert.equal(
  /\bbreak_late_seconds\b/i.test(migrationSql),
  false,
  "R2C-B-02D must not write break_late_seconds.",
);
assertNoForbiddenPattern(
  /\binsert\s+into\s+public\.worker_attendance\b/i,
  "R2C-B-02D must not insert attendance rows yet.",
);
assertNoForbiddenPattern(
  /\binsert\s+into\s+public\.worker_records\b|\bupdate\s+public\.worker_records\b/i,
  "R2C-B-02D must not write worker_records yet.",
);
assertNoForbiddenPattern(
  /\bcuti_stock\s*=\s*cuti_stock\s*-\s*1\b/i,
  "R2C-B-02D must not decrement cuti_stock yet.",
);
assertNoForbiddenPattern(
  /\bwrite_audit_log\s*\(/i,
  "R2C-B-02D must not write audit logs yet.",
);

assertSqlIncludes("auth.uid()");
assertSqlIncludes("tracker.unauthenticated");
assertSqlIncludes("tracker.unauthorized");
assertSqlIncludes("tracker.invalid_action");
assertSqlIncludes("tracker.invalid_target");
assertSqlIncludes("tracker.version_conflict");
assertSqlIncludes("tracker.invalid_transition");
assertSqlIncludes("tracker.alpha_rejected");
assertSqlIncludes("u.is_deleted = false");
assertSqlIncludes("u.tier in ('owner', 'admin')");
assertSqlIncludes("'START'");
assertSqlIncludes("'ISTIRAHAT'");
assertSqlIncludes("'LANJUT'");
assertSqlIncludes("'SELESAI'");
assertSqlIncludes("'CUTI'");
assertSqlIncludes("'IZIN'");
assertSqlIncludes("'SAKIT'");
assertSqlIncludes("p_expected_version is null or p_expected_version < 0");
assertSqlIncludes("app_private.apply_tracker_action_impl");
assertSqlIncludes("from public.worker_status as ws");
assertSqlIncludes("for update");
assertSqlIncludes("from public.worker_profiles as wp");
assertSqlIncludes("tu.is_deleted = false");
assertSqlIncludes("v_from_version <> p_expected_version");
assertSqlIncludes("version = v_from_version + 1");
assertSqlIncludes("v_to_version is distinct from v_from_version + 1");
assertSqlIncludes("v_wib_timestamp := p_now at time zone 'Asia/Jakarta'");
assertSqlIncludes("v_attendance_date := v_wib_date - 1");
assertSqlIncludes("v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date");
assertSqlIncludes("pg_catalog.make_timestamptz");
assertSqlIncludes("pg_catalog.make_interval(mins => 10)");
assertSqlIncludes("v_display_status_before := 'LATE'");
assertSqlIncludes("v_display_status_before = 'ALPHA'");
assertSqlIncludes("v_work_late_seconds_delta");
assertSqlIncludes("if v_action = 'START' then");
assertSqlIncludes("elsif v_action = 'ISTIRAHAT' then");
assertSqlIncludes("elsif v_action = 'LANJUT' then");
assertSqlIncludes("elsif v_action = 'SELESAI' then");
assertSqlIncludes("current_status = 'on'");
assertSqlIncludes("current_status = 'break'");
assertSqlIncludes("current_status = 'off'");
assertSqlIncludes("shift_active_date = v_attendance_date");
assertSqlIncludes("shift_active_started_at = p_now");
assertSqlIncludes("break_started_at = p_now");
assertSqlIncludes("break_timer_running = true");
assertSqlIncludes("break_accumulated_secs = v_break_accumulated_secs");
assertSqlIncludes("break_started_at = null");
assertSqlIncludes("break_timer_running = false");
assertSqlIncludes("shift_active_date = null");
assert.equal(
  /\b(current_status|status)\s*=\s*'izin'\b/i.test(migrationSql),
  false,
  "IZIN must map to pending and must not introduce an izin DB status.",
);

console.log("Tracker RPC migration static tests passed.");

function readR2CBMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_2c_b_tracker_action_rpc.sql"),
  );

  assert.ok(
    migrationFile,
    "R2C-B tracker RPC migration not found yet. This is expected before R2C-B-02C.",
  );

  return readFileSync(join(migrationsDir, migrationFile), "utf8");
}

function assertFunctionShape(functionSql: string, expectedSignature: string) {
  const normalizedFunction = normalizeSql(functionSql);

  assert.ok(
    normalizedFunction.includes(normalizeSql(`create or replace function ${expectedSignature}`)),
    `Missing exact function signature: ${expectedSignature}`,
  );
  assert.ok(
    normalizedFunction.includes("returns jsonb"),
    `${expectedSignature} must return jsonb.`,
  );
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

function extractFunctionSql(functionName: string) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${escapeRegExp(functionName)}\\s*\\([\\s\\S]*?\\n\\$\\$;`,
    "i",
  );
  const match = migrationSql.match(pattern);

  assert.ok(match, `Missing function body for ${functionName}.`);
  return match[0];
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
