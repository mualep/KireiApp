import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  hasValidationIssues,
  loadAndValidateBulkUsers,
  printRedactedValidationSummary,
} from "./bulk-users/shared";

const executeFlag = "--execute";
const allowedFlags = new Set([executeFlag]);
const args = process.argv.slice(2);
const unknownFlags = args.filter((arg) => arg.startsWith("-") && !allowedFlags.has(arg));
const shouldExecute = args.includes(executeFlag);

if (unknownFlags.length > 0) {
  console.error(`Unknown flag(s): ${unknownFlags.join(", ")}`);
  process.exit(1);
}

const loaded = loadAndValidateBulkUsers();

if (!loaded.ok) {
  console.error(loaded.message);
  process.exit(1);
}

printRedactedValidationSummary(
  loaded.result,
  shouldExecute ? "Bulk user bootstrap import validation" : "Bulk user bootstrap import dry-run",
);

if (hasValidationIssues(loaded.result)) {
  process.exit(1);
}

if (!shouldExecute) {
  console.log("");
  console.log("Mode: dry-run/read-only");
  console.log("Supabase Admin API: not called");
  console.log("Database writes: not attempted");
  process.exit(0);
}

console.log("");
console.log("Mode: execute requested");

const schemaStatus = inspectMigrationSchema();

if (schemaStatus.missingTables.length > 0) {
  console.error("Execution blocked: current migrations do not create every table required for bulk worker bootstrap.");
  console.error(`Missing table(s): ${schemaStatus.missingTables.join(", ")}`);
  console.error("Release 2 worker tables must exist before this script can create auth users or write application rows.");
  console.error("Supabase Admin API: not called");
  console.error("Database writes: not attempted");
  process.exit(1);
}

const missingEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Execution blocked: missing required environment variable(s): ${missingEnvVars.join(", ")}`);
  console.error("Supabase Admin API: not called");
  console.error("Database writes: not attempted");
  process.exit(1);
}

console.error("Execution blocked: write mode is intentionally not implemented until the Release 2 worker schema lands.");
console.error("Supabase Admin API: not called");
console.error("Database writes: not attempted");
process.exit(1);

function inspectMigrationSchema() {
  const migrationSql = readMigrationSql();
  const requiredTables = ["public.users", "public.worker_profiles", "public.worker_status", "public.audit_logs"];
  const presentTables = requiredTables.filter((table) => migrationCreatesTable(migrationSql, table));

  return {
    requiredTables,
    presentTables,
    missingTables: requiredTables.filter((table) => !presentTables.includes(table)),
  };
}

function readMigrationSql() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");

  if (!existsSync(migrationsDir)) {
    return "";
  }

  return readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .map((entry) => {
      const filePath = join(migrationsDir, entry);
      return statSync(filePath).isFile() ? readFileSync(filePath, "utf8") : "";
    })
    .join("\n");
}

function migrationCreatesTable(sql: string, table: string) {
  const [schema, tableName] = table.split(".");
  const escapedSchema = escapeRegExp(schema ?? "");
  const escapedTableName = escapeRegExp(tableName ?? "");
  const pattern = new RegExp(
    String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${escapedSchema}\.${escapedTableName}\b`,
    "i",
  );

  return pattern.test(sql);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
