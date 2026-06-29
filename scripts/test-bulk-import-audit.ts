import assert from "node:assert/strict";

import {
  assertSafeBulkImportAuditPayload,
  buildBulkImportAuditPayload,
  createEmptyBulkImportExecutionResult,
} from "./bulk-users/audit";
import type { BulkUserRow, BulkUserValidationResult } from "./bulk-users/shared";

const auditPayloadKeys = [
  "created_auth_users",
  "dry_run",
  "inserted_worker_statuses",
  "owners_count",
  "reused_auth_users",
  "skipped_worker_statuses",
  "source_path",
  "total_users",
  "upserted_public_users",
  "upserted_worker_profiles",
  "workers_count",
].sort();

const validationResult = buildValidationResult();
const result = createEmptyBulkImportExecutionResult();

result.createdAuthUsers = 70;
result.reusedAuthUsers = 7;
result.upsertedAppUsers = 77;
result.upsertedWorkerProfiles = 75;
result.createdWorkerStatuses = 73;
result.reusedWorkerStatuses = 2;

const payload = buildBulkImportAuditPayload(validationResult, result);

assert.deepEqual(Object.keys(payload).sort(), auditPayloadKeys);
assert.deepEqual(payload, {
  created_auth_users: 70,
  dry_run: false,
  inserted_worker_statuses: 73,
  owners_count: 2,
  reused_auth_users: 7,
  skipped_worker_statuses: 2,
  source_path: ".local/bulk-user-bootstrap-preview.csv",
  total_users: 77,
  upserted_public_users: 77,
  upserted_worker_profiles: 75,
  workers_count: 75,
});

assertSafeBulkImportAuditPayload(payload);

const serializedPayload = JSON.stringify(payload).toLowerCase();
assert.equal(serializedPayload.includes("password"), false);
assert.equal(serializedPayload.includes("not-in-audit"), false);
assert.equal(serializedPayload.includes("service_role"), false);
assert.equal(serializedPayload.includes("api_key"), false);

console.log("Bulk import audit tests passed.");

function buildValidationResult(): BulkUserValidationResult {
  const owners = Array.from({ length: 2 }, (_, index) => buildRow("owner", index + 1));
  const workers = Array.from({ length: 75 }, (_, index) => buildRow("member", index + 3));
  const rows = [...owners, ...workers];

  return {
    checklist: [],
    issues: [],
    owners,
    rows,
    sourcePath: ".local/bulk-user-bootstrap-preview.csv",
    workers,
  };
}

function buildRow(tier: "member" | "owner", index: number): BulkUserRow {
  const isWorker = tier === "member";
  return {
    avatar_initials: `U${index}`,
    cuti_stock: isWorker ? "2" : "",
    email: `user-${index}@example.test`,
    employee_role: isWorker ? "Professional Player" : "",
    is_deleted: "false",
    is_flexible: isWorker ? "false" : "",
    name: `User ${index}`,
    password: "not-in-audit",
    shift: isWorker ? "A" : "",
    shift_end: isWorker ? "14:00" : "",
    shift_start: isWorker ? "06:00" : "",
    show_card: isWorker ? "true" : "",
    tier,
  };
}
