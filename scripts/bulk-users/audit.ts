import type { BulkUserValidationResult } from "./shared";

export const bulkImportAuditJwtEnvKey = "KIREIKU_BULK_IMPORT_AUDIT_JWT";

export type BulkImportExecutionResult = {
  createdAuthUsers: number;
  createdWorkerStatuses: number;
  reusedAuthUsers: number;
  reusedWorkerStatuses: number;
  upsertedAppUsers: number;
  upsertedWorkerProfiles: number;
};

export type BulkImportAuditPayload = {
  created_auth_users: number;
  dry_run: false;
  inserted_worker_statuses: number;
  owners_count: number;
  reused_auth_users: number;
  skipped_worker_statuses: number;
  source_path: string;
  total_users: number;
  upserted_public_users: number;
  upserted_worker_profiles: number;
  workers_count: number;
};

const unsafeAuditPayloadPattern = /\b(password|passphrase|secret|service_role|credential|api_key|token)\b/i;

export function createEmptyBulkImportExecutionResult(): BulkImportExecutionResult {
  return {
    createdAuthUsers: 0,
    createdWorkerStatuses: 0,
    reusedAuthUsers: 0,
    reusedWorkerStatuses: 0,
    upsertedAppUsers: 0,
    upsertedWorkerProfiles: 0,
  };
}

export function buildBulkImportAuditPayload(
  validationResult: BulkUserValidationResult,
  result: BulkImportExecutionResult,
): BulkImportAuditPayload {
  const payload = {
    created_auth_users: result.createdAuthUsers,
    dry_run: false,
    inserted_worker_statuses: result.createdWorkerStatuses,
    owners_count: validationResult.owners.length,
    reused_auth_users: result.reusedAuthUsers,
    skipped_worker_statuses: result.reusedWorkerStatuses,
    source_path: validationResult.sourcePath,
    total_users: validationResult.rows.length,
    upserted_public_users: result.upsertedAppUsers,
    upserted_worker_profiles: result.upsertedWorkerProfiles,
    workers_count: validationResult.workers.length,
  } satisfies BulkImportAuditPayload;

  assertSafeBulkImportAuditPayload(payload);
  return payload;
}

export function assertSafeBulkImportAuditPayload(payload: BulkImportAuditPayload) {
  if (unsafeAuditPayloadPattern.test(JSON.stringify(payload))) {
    throw new Error("Unsafe bulk import audit payload.");
  }
}
