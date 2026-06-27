import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const truthTablePath = resolve(
  projectRoot,
  "docs/plans/release-3f-records-override-truth-table.md",
);
const packageJsonPath = resolve(projectRoot, "package.json");

assert.ok(existsSync(truthTablePath), "R3F Records override truth table must exist.");

const truthTableSource = readFileSync(truthTablePath, "utf8");
const packageJsonSource = readFileSync(packageJsonPath, "utf8");

assertIncludes(packageJsonSource, '"test:records-override-truth-table"');

for (const required of [
  "| `NULL` | Set Value | `Value` |",
  "| `Value` | Set New Value | `New Value` |",
  "| `Value` | Clear Override | `NULL` |",
  "Negative values rejected",
  "Invalid field names rejected",
  "worker_records.updated_at",
  "worker_records_override_log",
  "audit_logs",
]) {
  assertIncludes(truthTableSource, required);
}

console.log("Records override truth table tests passed.");

function assertIncludes(source: string, expected: string) {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}
