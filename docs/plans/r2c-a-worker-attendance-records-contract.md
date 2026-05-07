# R2C-A Worker Attendance And Records Contract

Purpose: lock the schema-side contract that future R2C-B tracker actions must use when writing attendance and monthly record side effects.

## Source Of Truth

| Data | Table | Rule |
| --- | --- | --- |
| Current operational state | `worker_status` | Stored states only. `LATE` remains derived and must never be stored. |
| Daily attendance outcome | `worker_attendance` | One row per worker/date when an outcome exists. |
| Monthly aggregate/reporting snapshot | `worker_records` | One row per worker/month. Override fields block blind future recalculation. |
| Current leave balance | `worker_profiles.cuti_stock` | Current canonical balance. `worker_records.cuti_stock_snapshot` is historical/reporting-only. |

## Future R2C-B Side Effects

| Future action | Attendance side effect | Records/profile side effect |
| --- | --- | --- |
| `START` from `OFF` | Upsert `hadir` for the shift date. | None. |
| `START` from derived `LATE` | Upsert `hadir` for the shift date. | Increment `worker_records.work_late_seconds` by server-computed lateness seconds. |
| `CUTI` | Upsert `cuti` for the shift date. | Require `worker_profiles.cuti_stock > 0`, decrement current stock, and snapshot the post-mutation stock. |
| `SAKIT` | Upsert `sakit` for the shift date. | Increment `worker_records.sakit_days` once for the effective date. |
| `PENDING` | Upsert `pending` for the shift date. | Increment `worker_records.pending_days` once for the effective date. |
| `AUTO_ALPHA` | Upsert `alpha` from cron/system only. | Increment `worker_records.alpha_count` and set `worker_status.alpha_done`. Tracker must not create alpha attendance. |
| `BREAK_LATE` | None. | Increment `worker_records.break_late_seconds` once per break episode and set `worker_status.break_late_recorded = true`. |
| `LEMBUR` | Deferred. | `worker_records.lembur_units` is storage-only until start/finalize/cancel semantics are planned. |

## Mutation Boundary Requirements

- Every future side effect must be driven by the current server-side `worker_status.version`.
- Retries and conflicts must not double-increment `worker_records`.
- Future multi-table writes should be transaction-bound before enabling tracker controls.
- Successful future mutations must write `public.write_audit_log`; audit failure should fail closed.
- Member remains self-read-only and must never receive tracker mutation controls.
