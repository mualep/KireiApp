import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// ─── Signatures ────────────────────────────────────────────────────────────
const sigDeactivatePublic =
  "public.deactivate_worker(p_target_user_id uuid)";
const sigReactivatePublic =
  "public.reactivate_worker(p_target_user_id uuid)";
const sigIssueSpPublic =
  "public.issue_worker_sp(p_target_user_id uuid, p_sp_level integer, p_reason text, p_expires_at timestamptz)";
const sigRevokeSpPublic =
  "public.revoke_worker_sp(p_sp_id uuid)";

const sigDeactivatePrivate =
  "app_private.deactivate_worker_impl(p_actor_user_id uuid, p_target_user_id uuid, p_now timestamptz)";
const sigReactivatePrivate =
  "app_private.reactivate_worker_impl(p_actor_user_id uuid, p_target_user_id uuid, p_now timestamptz)";
const sigIssueSpPrivate =
  "app_private.issue_worker_sp_impl(p_actor_user_id uuid, p_target_user_id uuid, p_sp_level integer, p_reason text, p_expires_at timestamptz, p_now timestamptz)";
const sigRevokeSpPrivate =
  "app_private.revoke_worker_sp_impl(p_actor_user_id uuid, p_sp_id uuid, p_now timestamptz)";

// ─── Load migration ─────────────────────────────────────────────────────────
const migrationSql = readMigration();
const normalizedSql = normalizeSql(migrationSql);
const spTableSql = extractCreateTableSql("worker_sp_logs");

// ─── Table structure ─────────────────────────────────────────────────────────
assertSqlIncludes("create table if not exists public.worker_sp_logs");
assertSqlIncludes("user_id uuid not null references public.users(id)");
assertSqlIncludes("sp_level integer not null");
assertSqlIncludes("reason text not null");
assertSqlIncludes("issued_by uuid not null references public.users(id)");
assertSqlIncludes("issued_at timestamptz not null");
assertSqlIncludes("expires_at timestamptz not null");
assertSqlIncludes("revoked_by uuid");
assertSqlIncludes("revoked_at timestamptz");

// sp_level check constraint: 1, 2, or 3
assert.ok(
  spTableSql.includes("1") && spTableSql.includes("2") && spTableSql.includes("3"),
  "worker_sp_logs must constrain sp_level to 1, 2, or 3",
);

// ─── Table security ──────────────────────────────────────────────────────────
assertSqlIncludes("alter table public.worker_sp_logs enable row level security");
assertSqlIncludes("revoke all on public.worker_sp_logs from anon, authenticated");
assertSqlIncludes("grant select on public.worker_sp_logs to authenticated");

// ─── Deactivate worker functions ────────────────────────────────────────────
const deactivatePrivateSql = extractFunctionSql("app_private.deactivate_worker_impl");
const deactivatePublicSql = extractFunctionSql("public.deactivate_worker");

assertFunctionShape(deactivatePrivateSql, sigDeactivatePrivate, "void");
assertFunctionShape(deactivatePublicSql, sigDeactivatePublic, "void");

// Must set is_deleted = true and show_card = false
assert.ok(
  normalizeSql(deactivatePrivateSql).includes("is_deleted = true"),
  "deactivate_worker_impl must set is_deleted = true",
);
assert.ok(
  normalizeSql(deactivatePrivateSql).includes("show_card = false"),
  "deactivate_worker_impl must set show_card = false",
);

// ─── Reactivate worker functions ────────────────────────────────────────────
const reactivatePrivateSql = extractFunctionSql("app_private.reactivate_worker_impl");
const reactivatePublicSql = extractFunctionSql("public.reactivate_worker");

assertFunctionShape(reactivatePrivateSql, sigReactivatePrivate, "void");
assertFunctionShape(reactivatePublicSql, sigReactivatePublic, "void");

assert.ok(
  normalizeSql(reactivatePrivateSql).includes("is_deleted = false"),
  "reactivate_worker_impl must set is_deleted = false",
);

// ─── Issue SP functions ──────────────────────────────────────────────────────
const issueSpPrivateSql = extractFunctionSql("app_private.issue_worker_sp_impl");
const issueSpPublicSql = extractFunctionSql("public.issue_worker_sp");

assertFunctionShape(issueSpPrivateSql, sigIssueSpPrivate, "uuid");
assertFunctionShape(issueSpPublicSql, sigIssueSpPublic, "uuid");

assert.ok(
  normalizeSql(issueSpPrivateSql).includes("insert into public.worker_sp_logs"),
  "issue_worker_sp_impl must insert into worker_sp_logs",
);

// ─── Revoke SP functions ─────────────────────────────────────────────────────
const revokeSpPrivateSql = extractFunctionSql("app_private.revoke_worker_sp_impl");
const revokeSpPublicSql = extractFunctionSql("public.revoke_worker_sp");

assertFunctionShape(revokeSpPrivateSql, sigRevokeSpPrivate, "void");
assertFunctionShape(revokeSpPublicSql, sigRevokeSpPublic, "void");

assert.ok(
  normalizeSql(revokeSpPrivateSql).includes("revoked_by ="),
  "revoke_worker_sp_impl must set revoked_by",
);
assert.ok(
  normalizeSql(revokeSpPrivateSql).includes("revoked_at ="),
  "revoke_worker_sp_impl must set revoked_at",
);

// ─── Audit logging ───────────────────────────────────────────────────────────
assertSqlIncludes("app_private.write_audit_log");

// ─── Grants / Revokes ────────────────────────────────────────────────────────
// Private functions: locked away from all roles
for (const [schema, name, types] of [
  ["app_private", "deactivate_worker_impl", "uuid, uuid, timestamptz"],
  ["app_private", "reactivate_worker_impl", "uuid, uuid, timestamptz"],
  ["app_private", "issue_worker_sp_impl", "uuid, uuid, integer, text, timestamptz, timestamptz"],
  ["app_private", "revoke_worker_sp_impl", "uuid, uuid, timestamptz"],
] as const) {
  const sig = `${schema}.${name}(${types})`;
  assertSqlIncludes(`revoke execute on function ${sig} from public`);
  assertSqlIncludes(`revoke execute on function ${sig} from anon`);
  assertSqlIncludes(`revoke execute on function ${sig} from authenticated`);
}

// Public functions: authenticated only
for (const [name, types] of [
  ["deactivate_worker", "uuid"],
  ["reactivate_worker", "uuid"],
  ["issue_worker_sp", "uuid, integer, text, timestamptz"],
  ["revoke_worker_sp", "uuid"],
] as const) {
  const sig = `public.${name}(${types})`;
  assertSqlIncludes(`revoke execute on function ${sig} from public`);
  assertSqlIncludes(`revoke execute on function ${sig} from anon`);
  assertSqlIncludes(`grant execute on function ${sig} to authenticated`);
}

// ─── Auth boundary in public wrappers ────────────────────────────────────────
assertSqlIncludes("auth.uid()");

console.log("Users Manager RPC migration static tests passed.");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_3g_users_manager_rpc.sql"),
  );
  assert.ok(migrationFile, "Users Manager RPC migration file not found.");
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
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${escaped}\\s*\\([\\s\\S]*?\\n\\$\\$;`,
    "gi",
  );
  const matches = [...migrationSql.matchAll(pattern)];
  assert.ok(matches.length > 0, `Missing function body for ${functionName}.`);
  return matches[matches.length - 1][0];
}

function assertFunctionShape(
  functionSql: string,
  expectedSignature: string,
  returnType: string,
) {
  const normalized = normalizeSql(functionSql);
  assert.ok(
    normalized.includes(normalizeSql(`create or replace function ${expectedSignature}`)),
    `Missing exact function signature: ${expectedSignature}`,
  );
  assert.ok(
    normalized.includes(`returns ${returnType}`),
    `${expectedSignature} must return ${returnType}.`,
  );
  assert.ok(
    normalized.includes("language plpgsql"),
    `${expectedSignature} must use language plpgsql.`,
  );
  assert.ok(
    normalized.includes("security definer"),
    `${expectedSignature} must be SECURITY DEFINER.`,
  );
  assert.ok(
    normalized.includes("set search_path = ''"),
    `${expectedSignature} must set an empty search_path.`,
  );
}

function assertSqlIncludes(fragment: string) {
  assert.ok(
    normalizedSql.includes(normalizeSql(fragment)),
    `Missing SQL fragment: ${fragment}`,
  );
}

function normalizeSql(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}
