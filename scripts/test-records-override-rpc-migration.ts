import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const expectedPublicSignature =
  "public.apply_records_override(p_target_user_id uuid, p_period_month date, p_field_name text, p_before_value integer, p_after_value integer, p_reason text)";
const expectedPrivateSignature =
  "app_private.apply_records_override_impl(p_actor_user_id uuid, p_target_user_id uuid, p_period_month date, p_field_name text, p_before_value integer, p_after_value integer, p_reason text, p_now timestamptz)";

const migrationSql = readMigration();
const normalizedSql = normalizeSql(migrationSql);
const ledgerSql = extractCreateTableSql("worker_records_override_log");
const publicFunctionSql = extractFunctionSql("public.apply_records_override");
const privateFunctionSql = extractFunctionSql("app_private.apply_records_override_impl");

assertSqlIncludes("create table if not exists public.worker_records_override_log");
assertSqlIncludes("target_user_id uuid not null references public.users(id)");
assertSqlIncludes("actor_user_id uuid not null references public.users(id)");
assertSqlIncludes("period_month date not null");
assertSqlIncludes("field_name text not null");
assertSqlIncludes("before_value integer");
assertSqlIncludes("after_value integer");
assertSqlIncludes("reason text");

for (const field of [
  "work_late_override_seconds",
  "break_late_override_seconds",
  "alpha_override_count",
  "sakit_override_days",
  "pending_override_days",
  "lembur_override_units",
  "cuti_stock_override_snapshot"
]) {
  assert.ok(ledgerSql.includes(`'${field}'`), `Ledger must include constrained field: ${field}`);
}

assertSqlIncludes("alter table public.worker_records_override_log enable row level security");
assertSqlIncludes("revoke all on public.worker_records_override_log from anon, authenticated");
assertSqlIncludes("grant select on public.worker_records_override_log to authenticated");

assertFunctionShape(publicFunctionSql, expectedPublicSignature);
assertFunctionShape(privateFunctionSql, expectedPrivateSignature);

assertSqlIncludes(
  "revoke execute on function public.apply_records_override(uuid, date, text, integer, integer, text) from public"
);
assertSqlIncludes(
  "revoke execute on function public.apply_records_override(uuid, date, text, integer, integer, text) from anon"
);
assertSqlIncludes(
  "grant execute on function public.apply_records_override(uuid, date, text, integer, integer, text) to authenticated"
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_records_override_impl(uuid, uuid, date, text, integer, integer, text, timestamptz) from public"
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_records_override_impl(uuid, uuid, date, text, integer, integer, text, timestamptz) from anon"
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_records_override_impl(uuid, uuid, date, text, integer, integer, text, timestamptz) from authenticated"
);

assertSqlIncludes("app_private.write_audit_log");
assertSqlIncludes("auth.uid()");

console.log("Records override RPC migration static tests passed.");

function readMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_3e_records_override_rpc.sql"),
  );

  assert.ok(migrationFile, "Records override RPC migration not found.");
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
    "gi",
  );
  const matches = [...migrationSql.matchAll(pattern)];

  assert.ok(matches.length > 0, `Missing function body for ${functionName}.`);
  return matches[matches.length - 1][0];
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
