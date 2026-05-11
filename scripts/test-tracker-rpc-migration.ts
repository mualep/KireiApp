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
assertNoForbiddenPattern(/\b(cron|reset|cancel|lembur)\b/i, "R2C-B-02 baseline excludes cron/reset/cancel/lembur automation.");

assert.equal(
  /\bbreak_late_seconds\b/i.test(migrationSql),
  false,
  "R2C-B-02C skeleton must not write break_late_seconds.",
);

assertSqlIncludes("auth.uid()");
assertSqlIncludes("tracker.unauthenticated");
assertSqlIncludes("tracker.unauthorized");
assertSqlIncludes("tracker.invalid_action");
assertSqlIncludes("tracker.invalid_target");
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
assertSqlIncludes("skeleton_only");
assertSqlIncludes("app_private.apply_tracker_action_impl");
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
