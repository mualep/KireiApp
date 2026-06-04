# Release 3B Absensi Correction Contract

## Status

- Release 3B is a contract-only planning and guardrail slice.
- R3A Absensi remains read-only.
- No correction UI, RPC, Server Action, migration, or mutation path is introduced in this release.
- PRD v1 remains frozen.

## Purpose

Release 3B prepares the future Absensi/Admin correction flow without enabling it yet. The goal is to lock the correction boundary before touching data mutation code because correction will affect `worker_attendance`, `worker_records`, `worker_profiles.cuti_stock`, RLS, and audit logs.

## Actor Contract

- Owner and Admin are the only future actors allowed to correct Absensi attendance.
- Member remains self-only and read-only for Absensi.
- Member can read only their own Absensi data.
- Member must not receive correction controls, correction Server Actions, correction RPC success, or broader worker data.
- Public and unauthenticated users remain redirected away from `/admin/absensi`.
- Authenticated Customer remains out of PRD v1.

## Correction Status Contract

The Absensi correction vocabulary is:

- `hadir`
- `cuti`
- `sakit`
- `pending`
- `alpha`

The first future implementable mutation slice should cover only:

- `hadir`
- `cuti`
- `sakit`
- `pending`

`alpha` belongs to the Absensi/Admin correction contract, but its implementation is deferred until the ALPHA truth table is stronger. Tracker must not create, correct, or recover `alpha`. `LATE` is derived-only and must never be stored as an attendance status.

## Attendance Mutation Contract

Future correction must use one server-side transactional mutation boundary. R3B does not create that boundary.

Future rules:

- `worker_attendance` remains the daily attendance source of truth.
- A worker/date pair should have one active attendance outcome.
- A correction may create the first active outcome for a worker/date or replace the active outcome.
- Corrected attendance rows should use `source = 'absensi'`.
- Corrected attendance rows should use an Absensi-owned `source_action`, not a tracker source action.
- Previous active values must be recorded in an immutable correction ledger before or during the transaction.
- Rows must not be physically deleted.
- Existing canceled rows remain historical and ignored by the read-only Absensi grid.
- `LATE`, `LEMBUR`, `OFF`, `ON`, and `BREAK` are not Absensi attendance cell statuses.

## Records And Profile Delta Contract

Future correction must update raw monthly aggregates by deterministic deltas from the previous active attendance status to the corrected status.

- `hadir` removes absence-day effects for the corrected date and does not create late or lembur data.
- `cuti` applies leave-day effects and updates `worker_profiles.cuti_stock`.
- Changing away from `cuti` reverses the leave-day effect and restores `worker_profiles.cuti_stock` according to the transaction rule.
- `sakit` applies or reverses `worker_records.sakit_days`.
- `pending` applies or reverses `worker_records.pending_days`.
- `alpha` applies or reverses `worker_records.alpha_count`, but implementation is deferred.
- `worker_records.work_late_seconds`, `worker_records.break_late_seconds`, and `worker_records.lembur_units` must not be modified by this first correction contract.
- Override fields in `worker_records` must not be overwritten blindly by correction recalculation.

## Audit And Ledger Contract

Future correction must write both a correction ledger entry and an audit log entry in the same server-side transaction. Audit failure must fail closed.

The audit trail must include:

- Actor user id.
- Target worker user id.
- Attendance date.
- Before and after attendance status.
- Before and after attendance source and source action when available.
- Worker record deltas.
- Cuti stock before and after when affected.
- Human-readable reason or note.
- Timestamp.
- Linked attendance id or correction id.

The ledger should be immutable. Follow-up correction should append a new ledger entry rather than rewriting a previous one.

## Security And RLS Boundary

Future implementation should use an authenticated Owner/Admin server-side path. The preferred shape is:

- A public RPC wrapper with `SECURITY DEFINER` for the transaction boundary.
- An internal private-schema implementation function that authenticated clients cannot execute directly.
- Internal role checks based on trusted staff profile data.
- Normal authenticated user identity as the actor.
- No service-role or admin Supabase client in app code.
- RLS remains restrictive for direct table access.
- Member attempts must fail authorization.
- All writes must be validated server-side and audited.

## Guardrails Preserved

- No Absensi correction UI in R3B.
- No Absensi edit, save, reset, or correction controls in R3B.
- No Server Action in R3B.
- No RPC mutation in R3B.
- No insert, update, upsert, or delete path in R3B.
- No schema or migration in R3B.
- No `worker_records` query from the read-only Absensi grid.
- Tracker must not gain ALPHA correction.
- ALPHA correction is not from tracker.
- LATE is derived-only and not stored.
- Member remains self-only and read-only.
- No future scheduling.
- No Access Manager UI.
- No hard delete worker UI.
- No customer account or authenticated customer flow.

## Deferred Work

- Implement Absensi correction RPC.
- Add Absensi correction ledger schema.
- Add Owner/Admin correction UI.
- Add ALPHA correction behavior after the truth table is finalized.
- Add records UI.
- Add dashboard/profile completion work.
- Add LEMBUR flows.
- Add cron or realtime correction flows.
- Add future scheduling.
- Add customer account or customer auth.

## Verification Contract

R3B must add a static guardrail test that verifies this contract exists and that R3A Absensi still has no mutation path. The test script is `test:absensi-correction-contract`.
