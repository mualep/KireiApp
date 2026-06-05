# Absensi / Tracker Sync Deferred Requests

## Status

Deferred / out of scope for PRD v1 and R3D-C.

## Reason

These requests change the current architecture from historical Absensi correction into operational/future scheduling and Tracker synchronization. They require separate product, database, RPC, audit, and state-machine design.

## Requested But Deferred

1. Current/future Absensi cells interactive and correctable.
2. Current Absensi HADIR should behave like Tracker START.
3. Current Absensi CUTI should behave like Tracker CUTI.
4. Current Absensi SAKIT should behave like Tracker SAKIT.
5. Current Absensi PENDING should behave like Tracker PENDING.
6. Current Absensi ALPHA should directly make tracker/attendance ALPHA.
7. Future Absensi scheduling / auto-apply.
8. Future allowed statuses requested: CUTI, PENDING, ALPHA only.
9. Future HADIR and SAKIT not allowed.
10. Future CUTI must validate or reserve cuti_stock.
11. Absensi and Tracker should be synchronized.

## Why Deferred

- Future scheduling is out of scope v1.
- Tracker is the live operational state surface, not a scheduler.
- ALPHA correction is Absensi/Admin correction, not tracker action.
- Full sync needs idempotency, audit, worker_status rules, cuti_stock reservation, and failure handling.
- This must not be slipped into R3D-C UI polish.

## Candidate Future Slice

R3E / v1.x design amendment: Absensi current-day operational action and future scheduling design.

## Open Design Questions

- Should current-day Absensi call apply_tracker_action or a new Absensi-owned RPC?
- Should future schedules reserve cuti_stock at schedule time or apply time?
- How to cancel or amend scheduled future statuses?
- How to prevent double-apply?
- What is the source of truth for current status if Tracker and Absensi disagree?
- How should audit fail-closed behavior work?
- Should ALPHA remain Absensi-only and derived/admin-corrected rather than tracker-generated?
