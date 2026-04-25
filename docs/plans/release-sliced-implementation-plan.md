# Release-Sliced Implementation Plan

Purpose: replace the current optimistic phase plan with short release slices that depend on a frozen PRD first.

## Scope Note

This is sequencing guidance only. It does not start implementation and it does not rewrite the main PRD.

## Release 0: PRD Freeze Resolution

Focus:
- Resolve all `P0` items from the freeze checklist.
- Confirm and record `UD-01` to `UD-09`.
- Approve the auth/RLS matrix, state-machine truth table, source-of-truth ownership, and audit strategy.

Exit criteria:
- Security boundary accepted.
- State machine accepted.
- Schema ownership accepted.
- Shared unresolved-decision register updated with outcomes or explicit temporary defaults.

## Release 1: Foundation And Landing Baseline

Focus:
- Lock landing architecture around the approved content model.
- Lock bootstrap seeds, owner setup, and default app settings.
- Keep public-surface scope limited to current v1 PRD sections.

Exit criteria:
- Foundation work starts only after Release 0 decisions are approved.
- Landing content model is stable enough to seed and test.

## Release 2: Tracker Core

Focus:
- Build against the approved tracker contract, not the current scattered prose rules.
- Use the frozen display-status and audit rules.
- Keep the scope centered on live operational status and safe manual actions.

Exit criteria:
- Tracker behavior matches the frozen truth table.
- Derived realtime strategy is accepted and testable.

## Release 3: Admin Operations

Focus:
- Absensi, records, users, and SP flows.
- Respect the source-of-truth matrix and override rules.
- Do not broaden actor visibility beyond the approved freeze decisions.

Exit criteria:
- Daily and monthly data flows operate without source-of-truth conflicts.
- Worker lifecycle path matches the approved `UD-03` outcome.

## Release 4: Automation And Hardening

Focus:
- Cron automation, reconnect/reconciliation, security hardening, and performance hardening.
- Do not include configurable Access Manager UI in shipped v1.
- Keep Future Version items out unless PRD scope is formally amended.

Exit criteria:
- Automation rules are consistent with the frozen truth table.
- Hardening work does not reopen product-scope decisions.

## Dependencies And Entry Criteria

| Release | Entry criteria | What it blocks |
| --- | --- | --- |
| Release 0 | Current PRD audit package is reviewed | Blocks all later releases |
| Release 1 | `P0` resolved and baseline seeds/content model approved | Blocks tracker and admin surfaces |
| Release 2 | Release 1 foundation stable, auth/RLS/state truth approved | Blocks admin operations and cron |
| Release 3 | Tracker contract stable, source-of-truth rules accepted | Blocks automation and hardening |
| Release 4 | Core data flows stable and scope unchanged | Final pre-launch hardening |

## Unresolved Decisions Impact

| Decision | Releases affected | Impact |
| --- | --- | --- |
| `UD-01` | Release 0, 1 | Changes actor model, schema, auth flows, and route access |
| `UD-02` | Release 0, 2, 3 | Changes Member-facing pages, RLS, and test scope |
| `UD-03` | Release 0, 3 | Changes worker lifecycle, schema, and privileged operations |
| `UD-04` | Release 0, 4 | Determines whether configurable permissions UI ships in v1 |
| `UD-05` | Release 0, 1 | Changes CMS data model and seed content |
| `UD-06` | Release 0, 3 | Changes absensi scope and schema/API expectations |
| `UD-07` | Release 0, 2 | Changes tracker correction rules and audit behavior |
| `UD-08` | Release 0, 2, 4 | Changes lembur aggregation and reporting semantics |
| `UD-09` | Release 0, 2, 4 | Changes break-late idempotency and cron behavior |

## Unresolved Decision Status

### UD-01 Authenticated `Customer` in v1: keep or remove
- Recommended default: remove authenticated `Customer` from v1.
- Approved PRD decision: Remove authenticated `Customer` from v1. Buyers remain public anonymous users.

### UD-02 Member visibility model: `self-only` vs broader read access
- Recommended default: `Member` is `self-only`.
- Approved PRD decision: `Member` is self-only for tracker, records, and profile.

### UD-03 Worker lifecycle: `hard delete` vs `archive/deactivate-first`
- Recommended default: prefer `archive/deactivate-first` for v1.
- Approved PRD decision: Use archive/deactivate-first for worker lifecycle in v1. Do not ship hard delete UI in v1.

### UD-04 Access Manager UI: keep in v1 or defer
- Recommended default: defer configurable Access Manager UI if freeze scope is still unstable.
- Approved PRD decision: Defer configurable Access Manager UI from v1. Use a documented static permission matrix for v1.

### UD-05 FAQ model: dedicated rows/table vs structured JSON contract
- Recommended default: prefer dedicated FAQ rows/table for validated CRUD.
- Approved PRD decision: Use dedicated FAQ rows/table for validated FAQ CRUD.

### UD-06 Absensi `Custom Text` and future scheduling in v1
- Recommended default: remove `Custom Text` and future scheduling from v1.
- Approved PRD decision: Remove Absensi `Custom Text` and future scheduling from v1.

### UD-07 `ALPHA` correction path: tracker vs absensi/admin correction only
- Recommended default: remove tracker-based `ALPHA -> START`; use absensi/admin correction flow only.
- Approved PRD decision: Remove tracker-based `ALPHA -> START`. `ALPHA` corrections must go through Absensi/Admin correction flow only.

### UD-08 `LEMBUR` accumulation and rounding rule
- Recommended default: accumulate in one internal unit and round only at reporting boundaries.
- Approved PRD decision: Accumulate `LEMBUR` in one internal unit and round only at reporting boundaries.

### UD-09 `BREAK_LATE` idempotency rule
- Recommended default: record `BREAK_LATE` once per break episode after the threshold is crossed.
- Approved PRD decision: Record `BREAK_LATE` once per break episode after the threshold is crossed.

## Future Version Items

- Authenticated customer accounts.
- Future-dated attendance scheduling.
- Configurable Access Manager UI.
- Hard delete UI.
