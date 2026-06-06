# Release 3C Absensi Correction Truth Table

## Status

- Release 3C is a truth-table documentation and static guardrail test slice.
- R3A Absensi remains read-only.
- R3B Absensi correction contract remains the high-level contract.
- No correction UI, RPC, Server Action, migration, or mutation path was introduced in the original release.
- R3D-C amends this truth table before exposing the Owner/Admin UI.
- PRD v1 remains frozen.

## Purpose

Release 3C locks the smallest safe first Absensi/Admin correction mutation shape before any DB/RPC foundation work. The future mutation must be historical-day-only, must keep `alpha` controlled by Absensi/Admin only, and must avoid live tracker state mutation. R3D-C amends the contract to allow historical active `hadir` rows to be corrected to controlled absence statuses.

## Actor And Date Boundary

- Owner and Admin are the only future actors allowed to correct Absensi attendance.
- Member remains self-only and read-only for Absensi.
- Member must not receive correction controls, correction Server Actions, correction RPC success, or broader worker data.
- Future correction is historical-day-only: `attendance_date < current WIB date`.
- Current-day and future-date corrections are out of scope for the first DB/RPC slice.
- Hidden workers, missing worker profiles, inactive profiles represented by `show_card = false`, and deleted users must be rejected.
- Authenticated Customer remains out of PRD v1.

## Absensi Cell Display Contract

This is a visual display contract only. The display initials must not create extra stored statuses. The display initials must not change R3A read-only behavior yet.

| Attendance value | Cell initial |
| --- | --- |
| None | `-` |
| Hadir | `H` |
| Cuti | `C` |
| Sakit | `S` |
| Pending | `P` |
| Alpha | `A` |

Allowed controlled vocabulary for v1:

- `none`
- `hadir`
- `cuti`
- `sakit`
- `pending`
- `alpha`

Custom typed Absensi statuses are out of scope v1. v1 uses controlled status vocabulary only. Custom labels make records deltas, reporting, audit, and correction reversal non-deterministic.

## Allowed First Transitions

| Before active status | After status | Attendance rule | Records/profile rule |
| --- | --- | --- | --- |
| `none` | `hadir` | Insert or revive active `absensi.correct_hadir` row. | No records/profile delta. |
| `none` | `cuti` | Insert or revive active `absensi.correct_cuti` row. | `cuti_stock_delta = -1`; require stock > 0. |
| `none` | `sakit` | Insert or revive active `absensi.correct_sakit` row. | `sakit_days_delta = +1`. |
| `none` | `pending` | Insert or revive active `absensi.correct_pending` row. | `pending_days_delta = +1`. |
| `none` | `alpha` | Insert or revive active `absensi.correct_alpha` row. | `alpha_count_delta = +1`. |
| `hadir` | `cuti` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_cuti'`. | `cuti_stock_delta = -1`; require stock > 0. |
| `hadir` | `sakit` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_sakit'`. | `sakit_days_delta = +1`. |
| `hadir` | `pending` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_pending'`. | `pending_days_delta = +1`. |
| `hadir` | `alpha` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_alpha'`. | `alpha_count_delta = +1`. |
| `cuti` | `hadir` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_hadir'`. | Restore cuti stock. |
| `cuti` | `sakit` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_sakit'`. | Restore cuti stock, then apply `sakit_days_delta = +1`. |
| `cuti` | `pending` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_pending'`. | Restore cuti stock, then apply `pending_days_delta = +1`. |
| `cuti` | `alpha` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_alpha'`. | Restore cuti stock, then apply `alpha_count_delta = +1`. |
| `sakit` | `hadir` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_hadir'`. | Apply `sakit_days_delta = -1`. |
| `sakit` | `cuti` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_cuti'`. | Apply `sakit_days_delta = -1`, then `cuti_stock_delta = -1`; require stock > 0 before entering cuti. |
| `sakit` | `pending` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_pending'`. | Apply `sakit_days_delta = -1`, then `pending_days_delta = +1`. |
| `sakit` | `alpha` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_alpha'`. | Apply `sakit_days_delta = -1`, then `alpha_count_delta = +1`. |
| `pending` | `hadir` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_hadir'`. | Apply `pending_days_delta = -1`. |
| `pending` | `cuti` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_cuti'`. | Apply `pending_days_delta = -1`, then `cuti_stock_delta = -1`; require stock > 0 before entering cuti. |
| `pending` | `sakit` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_sakit'`. | Apply `pending_days_delta = -1`, then `sakit_days_delta = +1`. |
| `pending` | `alpha` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_alpha'`. | Apply `pending_days_delta = -1`, then `alpha_count_delta = +1`. |
| `alpha` | `hadir` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_hadir'`. | Apply `alpha_count_delta = -1`. |
| `alpha` | `cuti` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_cuti'`. | Apply `alpha_count_delta = -1`, then `cuti_stock_delta = -1`; require stock > 0 before entering cuti. |
| `alpha` | `sakit` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_sakit'`. | Apply `alpha_count_delta = -1`, then `sakit_days_delta = +1`. |
| `alpha` | `pending` | Update active row to `source = 'absensi'` and `source_action = 'absensi.correct_pending'`. | Apply `alpha_count_delta = -1`, then `pending_days_delta = +1`. |

## Rejected Or Deferred Transitions

- Same-status no-op is rejected.
- `alpha` is a controlled Absensi/Admin correction status.
- `alpha` is set manually from Absensi/Admin, not from Tracker.
- Active historical `hadir -> cuti`, `hadir -> sakit`, `hadir -> pending`, and `hadir -> alpha` are allowed.
- Tracker must not create, correct, or recover `alpha`.
- Current-day correction is deferred.
- Future-date correction is rejected.
- `LATE` is derived-only and must never be stored as an attendance status.
- `LEMBUR`, `OFF`, `ON`, and `BREAK` are not Absensi attendance cell statuses.

## Worker Attendance Rules

- `worker_attendance` remains the daily attendance source of truth.
- One active row per worker/date remains the invariant.
- Canceled rows count as no active row and may be revived.
- If no active row exists, future correction may insert a row or revive the existing canceled unique slot.
- If an active row exists, future correction may update it only when the requested `p_before_status` matches the locked active row.
- Future corrected rows must use `source = 'absensi'`.
- Future corrected rows must use `source_action = 'absensi.correct_<status>'`.
- Rows must not be physically deleted.
- Canceled rows remain historical and ignored by the read-only Absensi grid.
- Tracker-origin active `cuti`, `sakit`, and `pending` rows may be corrected only for historical dates.
- Tracker-origin active `hadir` rows may be corrected only for historical dates.
- Future Tracker displays may derive historical ALPHA/absence display from `worker_attendance` where appropriate.
- Absensi correction must not mutate live `worker_status` and must not require realtime sync in v1.
- Realtime synchronization between Absensi correction and live Tracker state is out of scope v1.

## Records And Cuti Delta Rules

Future correction computes deltas as `after contribution - before contribution`.

- `hadir` contributes no absence-day record delta.
- Entering `cuti` applies `cuti_stock_delta = -1`.
- Leaving `cuti` applies `cuti_stock_delta = +1`.
- Entering `sakit` applies `sakit_days_delta = +1`.
- Leaving `sakit` applies `sakit_days_delta = -1`.
- Entering `pending` applies `pending_days_delta = +1`.
- Leaving `pending` applies `pending_days_delta = -1`.
- Entering `alpha` applies `alpha_count_delta = +1`.
- Leaving `alpha` applies `alpha_count_delta = -1`.
- `alpha` does not touch `worker_records.work_late_seconds`.
- `alpha` does not touch `worker_records.break_late_seconds`.
- `alpha` does not touch `worker_records.lembur_units`.
- `alpha` does not touch override fields.
- `alpha` does not touch live `worker_status`.
- `cuti_stock_snapshot` becomes the post-mutation `worker_profiles.cuti_stock`.
- The future mutation must require non-negative final cuti stock.
- The future mutation must fail closed if it must reverse an existing side effect but the monthly `worker_records` row is missing.
- The first Absensi correction foundation must not modify `worker_records.work_late_seconds`.
- The first Absensi correction foundation must not modify `worker_records.break_late_seconds`.
- The first Absensi correction foundation must not modify `worker_records.lembur_units`.
- Override fields in `worker_records` must not be overwritten blindly.
- `worker_status` must not be mutated by the first Absensi correction foundation.

## Ledger And Audit Rules

Future DB/RPC work must extend or generalize the existing attendance correction ledger before enabling RPC behavior.

The ledger must record:

- Actor user id.
- Target worker user id.
- Attendance date.
- Attendance id.
- Before and after attendance status.
- Before and after attendance source and source action.
- `pending_days_delta`.
- `sakit_days_delta`.
- `alpha_count_delta`.
- `cuti_stock_delta`.
- Cuti stock before and after when affected.
- Reason is optional, stored as null when blank, and capped at 20 trimmed characters.
- Timestamp.

Audit must be written in the same transaction as attendance, records, profile, and ledger changes. Audit failure must fail closed and roll back all side effects.

## Future RPC Boundary

The future public RPC signature should be:

```sql
public.apply_absensi_correction(
  p_target_user_id uuid,
  p_attendance_date date,
  p_before_status text,
  p_after_status text,
  p_expected_attendance_id uuid,
  p_expected_attendance_updated_at timestamptz,
  p_reason text
)
```

The future private implementation signature should include actor and clock inputs:

```sql
app_private.apply_absensi_correction_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_attendance_date date,
  p_before_status text,
  p_after_status text,
  p_expected_attendance_id uuid,
  p_expected_attendance_updated_at timestamptz,
  p_reason text,
  p_now timestamptz
)
```

Boundary rules:

- Public wrapper reads actor from `auth.uid()`.
- Public wrapper validates Owner/Admin before delegating.
- Private implementation performs full validation and transaction-bound writes.
- Both functions should use `SECURITY DEFINER` and `set search_path = ''`.
- Private implementation must not be executable by `authenticated`.
- No dynamic SQL.
- No service-role or admin Supabase client in app code.
- RLS remains restrictive for direct table access.

## Idempotency And Conflict Rules

- If `p_before_status = 'none'`, then `p_expected_attendance_id` and `p_expected_attendance_updated_at` must be null.
- If `p_before_status = 'none'`, any active row for the worker/date is a conflict.
- If `p_before_status <> 'none'`, then `p_expected_attendance_id` and `p_expected_attendance_updated_at` must match the locked active row.
- If the locked active row status does not equal `p_before_status`, the mutation must fail as a state conflict.
- Re-running the same correction after success must fail as a state conflict and must not double-apply records, cuti stock, ledger, or audit deltas.
- Canceled rows count as no active row and may be revived by an allowed `none -> ...` transition.
- Audit failure must roll back attendance, records, profile, ledger, and any future RPC return side effects.

## Future Test Plan

Before DB/RPC implementation, add:

- Static migration test for ledger shape, RPC signatures, permissions, empty `search_path`, no dynamic SQL, no service-role string, and no tracker ALPHA.
- Behavior test using a local Supabase rollback probe for allowed transitions.
- Behavior test for rejected transitions: same-status no-op, over-20 reason, current/future date, hidden worker, deleted user, missing profile, Member unauthorized, stale expected id/timestamp, and cuti stock exhaustion.
- Behavior test proving empty reason stores a null ledger reason.
- Behavior test proving historical active `hadir -> cuti/sakit/pending/alpha` applies deterministic deltas.
- Behavior test for controlled `alpha` transitions and `alpha_count_delta` reversal.
- Behavior test for canceled-slot revival.
- Behavior test proving audit failure rolls back attendance, records, profile, ledger, and cuti stock.
- Existing `test:absensi-readonly` must continue passing before any UI slice.

## Guardrails Preserved

- No Absensi correction UI in R3C.
- No Absensi edit, save, reset, or correction controls in R3C.
- No direct client mutation in R3C.
- No insert, update, upsert, or delete path in R3C.
- R3D-C backend amendment uses an additive migration.
- No `worker_records` query from the read-only Absensi grid.
- Tracker must not gain ALPHA correction.
- ALPHA correction is not from tracker.
- LATE is derived-only and not stored.
- Member remains self-only and read-only.
- Realtime sync is deferred from v1.
- Custom typed Absensi statuses are deferred from v1.
- No future scheduling.
- No Access Manager UI.
- No hard delete worker UI.
- No customer account or authenticated customer flow.

## Assumptions

- R3A/R3B implementation and closure docs supersede the stale `/admin/absensi` Member-deny row in `auth-and-rls-matrix.md`.
- The first DB/RPC foundation avoids current-day live tracker state by requiring historical dates.
- `ALPHA` remains Absensi/Admin-only and is allowed in the first future correction mutation contract for historical days.
