# State Machine Truth Table

Purpose: unify tracker, cron, attendance, and records behavior into one freeze-ready operational reference.

## Current PRD Baseline

This document clarifies `§3.4`, `§3.5`, `§3.6`, `§3.10`, `§5.2-5.3`, `§6.3-6.5`, `§8`, `§12.1`, and `§13.2-13.3`.

## Shared Definitions

- Canonical time base: `WIB (UTC+7)`.
- Shift phase model: `PRE-SHIFT`, `IN-SHIFT`, `POST-SHIFT`.
- Cross-midnight shifts follow the PRD’s shift-span rules in `§8.2`.
- Grace period for derived lateness: `10 minutes` from shift start.
- Stored states: `off`, `on`, `break`, `cuti`, `sakit`, `pending`, `lembur`.
- Derived display states:
  - `ALPHA` when `alpha_done = true`
  - `LATE` when stored state is `off`, `alpha_done = false`, phase is `IN-SHIFT`, and grace period has passed

## Display Status Precedence

1. Show `ALPHA` if `alpha_done = true`.
2. Else show `LATE` if the lateness derivation rule is true.
3. Else show the stored DB status.

## Manual Action Truth Table

Unless otherwise noted, exact phase guards still rely on the current server-side validation rules in `§8.6`.

| Current stored state | Current display state | Allowed action | Required phase | Next stored state | Next display state | Attendance side effect | Records side effect | Audit required | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `off` | `OFF` | `START` | Per `§8.6` | `on` | `ON` | Set/confirm `hadir` for shift date | none | Yes | Normal start |
| `off` | `OFF` | `CUTI` | Per `§8.6` | `cuti` | `CUTI` | Set `cuti` | Decrement approved leave balance | Yes | Must respect non-negative balance |
| `off` | `OFF` | `SAKIT` | Per `§8.6` | `sakit` | `SAKIT` | Set `sakit` | Increment sakit total | Yes | Starts 72-hour pending timer |
| `off` | `OFF` | `PENDING` | Per `§8.6` | `pending` | `PENDING` | Set `pending` | Increment pending total | Yes | Urgent/manual exception path |
| `off` | `OFF` | `LEMBUR` | `POST-SHIFT` only | `lembur` | `LEMBUR` | none | Start lembur accumulation | Yes | Final unit tied to `UD-08` |
| `off` | `LATE` | `START` | `IN-SHIFT` | `on` | `ON` | Set/confirm `hadir` | Add work-late amount for this episode | Yes | `LATE` is display-only, not stored |
| `off` | `LATE` | `CUTI` / `SAKIT` / `PENDING` | `IN-SHIFT` | `cuti` / `sakit` / `pending` | Stored status | Replace late display with selected state | Do not add work-late for the abandoned late episode | Yes | One chosen path only |
| `off` | `ALPHA` | none in tracker | Any | `off` | `ALPHA` until corrected | Correction handled through Absensi/Admin correction flow only | No tracker-side change | Yes | Tracker-based `ALPHA -> START` is removed in v1 |
| `on` | `ON` | `SELESAI` | Per `§8.6` | `off` | `OFF` | Keep `hadir` | none | Yes | Standard shift end |
| `on` | `ON` | `ISTIRAHAT` | `IN-SHIFT` | `break` | `BREAK` | Keep `hadir` | none | Yes | Starts break episode |
| `break` | `BREAK` | `PAUSE` | `IN-SHIFT` | `break` | `BREAK` | none | none | Yes | Pauses break timer without ending episode |
| `break` | `BREAK` | `RESUME` | `IN-SHIFT` | `break` | `BREAK` | none | none | Yes | Resumes same break episode |
| `break` | `BREAK` | `STOP` | `IN-SHIFT` | `on` | `ON` | Keep `hadir` | none | Yes | Ends break episode |
| `cuti` | `CUTI` | `BATAL CUTI` | Before shift end | `off` | `OFF` or `LATE` by phase | Remove `cuti` entry for same date | Restore leave balance | Yes | Resulting display may become `LATE` if conditions now match |
| `sakit` | `SAKIT` | `BATAL SAKIT` | Before shift end | `off` | `OFF` or `LATE` by phase | Remove `sakit` entry for same date | Reverse same-day sakit increment | Yes | Final behavior still subject to current-day timing |
| `pending` | `PENDING` | `BATAL PENDING` | Before shift end | `off` | `OFF` or `LATE` by phase | Remove `pending` entry for same date | Reverse same-day pending increment | Yes | Same derived-state caution as above |
| `lembur` | `LEMBUR` | `BATAL LEMBUR` | `POST-SHIFT` | `off` | `OFF` | none | Cancel unfinished lembur episode | Yes | Threshold and rounding depend on `UD-08` |
| `lembur` | `LEMBUR` | `SELESAI` | `POST-SHIFT` | `off` | `OFF` | none | Finalize lembur episode | Yes | Final write rule depends on `UD-08` |

## Automatic Transition Truth Table

| Rule | Condition | Derived-only or write | Write target | Idempotency rule | Realtime implication | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AUTO_LATE` | Stored `off`, `alpha_done = false`, `IN-SHIFT`, grace period passed | Derived-only | none | n/a | Client must recompute or receive derived snapshot refresh | Never store `late` in DB |
| `AUTO_ALPHA` | `POST-SHIFT` and display status would be `LATE` with no successful start | Write | `worker_status.alpha_done`, `worker_attendance`, `worker_records` | One alpha write per worker per shift date | Realtime row change exists after write | Must use attendance uniqueness to avoid duplicate alpha |
| `ALPHA_DONE_RESET` | Stored `off`, `alpha_done = true`, new in-shift cycle has begun | Write | `worker_status.alpha_done = false` | Once per new cycle | Realtime row change exists after write | Resets prior alpha flag for new shift cycle |
| `AUTO_OFF_SHIFT` | Stored `on` or `break`, phase is `POST-SHIFT` | Write | `worker_status.status = off` | Once per episode close | Realtime row change exists after write | Break episode should be closed cleanly |
| `BREAK_LATE` | Stored `break`, effective break duration crosses allowed threshold | Write | `worker_records`, optional `worker_status.break_late_recorded` | Write once per break episode | Realtime record refresh may lag tracker card unless patched | Approved v1 write-once rule |
| `AUTO_ALPHA_EXPIRE` | Display `ALPHA` and expiry time has passed | Write | `worker_status.alpha_done = false`, stored status remains `off` | Once per alpha episode | Realtime row change exists after write | Returns worker to normal `off` display |
| `SAKIT_TO_PENDING` | Stored `sakit` and 72-hour threshold reached | Write | `worker_status.status = pending` | Once per sakit episode | Realtime row change exists after write | No repeat write after pending is reached |

## Conflict Resolution

- Manual action vs cron: optimistic locking wins. If a manual action commits first, cron must retry on the next run against the new row version.
- Absensi edit vs records override: attendance edits may update raw aggregates, but they must not overwrite fields with active manual override values.
- Derived-status reconciliation on reconnect: client should refetch raw row state plus a server-computed `derived_status` snapshot, then resume local timers/recompute for `LATE` and `BREAK` displays.

## Unresolved Decisions

### UD-07 `ALPHA` correction path: tracker vs absensi/admin correction only
- Recommended default: remove tracker-based `ALPHA -> START`; use absensi/admin correction flow only.
- Approved PRD decision: Remove tracker-based `ALPHA -> START`. `ALPHA` corrections must go through Absensi/Admin correction flow only.

### UD-08 `LEMBUR` accumulation and rounding rule
- Recommended default: accumulate `LEMBUR` in one internal unit and round only at reporting boundaries.
- Approved PRD decision: Accumulate `LEMBUR` in one internal unit and round only at reporting boundaries.

### UD-09 `BREAK_LATE` idempotency rule
- Recommended default: write `BREAK_LATE` once per break episode after threshold crossing.
- Approved PRD decision: Record `BREAK_LATE` once per break episode after the threshold is crossed.
