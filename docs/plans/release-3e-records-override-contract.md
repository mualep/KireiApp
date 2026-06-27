# Release 3E Records Manual Override Contract

## Status

- Release 3E is a contract-only planning and guardrail slice.
- No UI, RPC, Server Action, or migration is introduced in this release.
- PRD v1 remains frozen.

## Actor Contract

- Owner and Admin are the only actors allowed to execute records manual overrides.
- Member remains self-only and read-only. Members cannot edit overrides.
- Member must not receive correction controls, correction Server Actions, or correction RPC success.
- Public and unauthenticated users are denied.

## Target Constraints

- Overrides target the `worker_records` table specifically for a given `period_month`.
- It must NOT alter `worker_status` or `worker_attendance`.
- Target period constraints: must be a valid `period_month`.

## Allowed Override Fields

The exactly allowed override fields are:
- `work_late_override_seconds`
- `break_late_override_seconds`
- `alpha_override_count`
- `sakit_override_days`
- `pending_override_days`
- `lembur_override_units`
- `cuti_stock_override_snapshot`

## Value Constraints

- Overrides can be set to an integer `>= 0`.
- Overrides can be reverted to `NULL` (cleared).
- Target values must be `>= 0` or `NULL`.

## Concurrency and Guardrails

- Concurrency protection: `p_before_value` must match the existing DB value (optimistic locking).
- The required RPC signature is `apply_records_override(target_user_id, period_month, field_name, before_value, after_value, reason)`.

## Audit and Ledger

- Every override action must write to `audit_logs` (fail-closed).
- It must write to a ledger table `worker_records_override_log`.

## Expected Errors

Expected RPC error codes:
- `records.unauthorized`
- `records.invalid_target`
- `records.stale_override`
- `records.invalid_value`
