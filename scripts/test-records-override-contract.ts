import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const contractPath = resolve(
  projectRoot,
  "docs/plans/release-3e-records-override-contract.md",
);
const packageJsonPath = resolve(projectRoot, "package.json");

assert.ok(existsSync(contractPath), "R3E Records override contract must exist.");

const contractSource = readFileSync(contractPath, "utf8");
const packageJsonSource = readFileSync(packageJsonPath, "utf8");

assertIncludes(packageJsonSource, '"test:records-override-contract"');

for (const required of [
  "Owner and Admin",
  "Member remains self-only and read-only",
  "worker_records",
  "period_month",
  "work_late_override_seconds",
  "break_late_override_seconds",
  "alpha_override_count",
  "sakit_override_days",
  "pending_override_days",
  "lembur_override_units",
  "cuti_stock_override_snapshot",
  ">= 0",
  "NULL",
  "p_before_value",
  "apply_records_override",
  "audit_logs",
  "worker_records_override_log",
  "records.unauthorized",
  "records.invalid_target",
  "records.stale_override",
  "records.invalid_value",
]) {
  assertIncludes(contractSource, required);
}

console.log("Records override contract tests passed.");

function assertIncludes(source: string, expected: string) {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}
