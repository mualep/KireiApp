# PRD v1 Freeze Checklist

Purpose: a short, decision-focused checklist for making the current PRD ready to freeze without rewriting it yet.

## Current Readiness

- Current readiness score: `10/10`
- Freeze recommendation: `Main PRD reflects the approved Release 0 decisions, closes all P0 freeze blockers, and is ready to freeze as PRD v1.`

## Freeze Gate Checklist

- [x] Actor model for `Owner`, `Admin`, `Member`, and `Public / Buyer` is locked.
- [x] Auth, request-guard, RLS, and service-role boundaries are locked in main PRD text.
- [x] Worker account lifecycle direction is locked for v1.
- [x] State machine decision set is locked for v1.
- [x] Source-of-truth ownership across status, attendance, records, and overrides is locked in main PRD text.
- [x] Derived realtime strategy is locked.
- [x] General audit logging coverage is locked.

## Approved Release 0 Decisions

- `UD-01`: Remove authenticated `Customer` from v1. Buyers remain public anonymous users.
- `UD-02`: `Member` is self-only for tracker, records, and profile.
- `UD-03`: Use archive/deactivate-first for worker lifecycle in v1. Do not ship hard delete UI in v1.
- `UD-04`: Defer configurable Access Manager UI from v1. Use a documented static permission matrix for v1.
- `UD-05`: Use dedicated FAQ rows/table for validated FAQ CRUD.
- `UD-06`: Remove Absensi `Custom Text` and future scheduling from v1.
- `UD-07`: Remove tracker-based `ALPHA -> START`. `ALPHA` corrections must go through Absensi/Admin correction flow only.
- `UD-08`: Accumulate `LEMBUR` in one internal unit and round only at reporting boundaries.
- `UD-09`: Record `BREAK_LATE` once per break episode after the threshold is crossed.

## Priority Legend

- `P0`: must be fixed before PRD freeze.
- `P1`: should be fixed before development starts.
- `P2`: can be deferred to a later sprint without blocking freeze.
- `Out of Scope / Future Version`: do not expand v1 with these unless explicitly approved.

## P0 Must Fix Before Freeze

| Item | Problem | Why it matters | Recommended PRD change | Affected PRD sections | Change type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P0-1 | Actor model is contradictory across user stories, routes, and auth. Tied to `UD-01` and `UD-02`. | It changes route access, API scope, RLS, and tests. | Add one explicit actor-model amendment that states buyers are public anonymous users and `Member` is self-only for tracker, records, and profile. | `§1.3`, `§2.3-2.4`, `§3.1`, `§10`, `Appendix B` | Product decision, technical decision, API change, test plan change | Resolved in Release 0 decision |
| P0-2 | Auth, request-guard, RLS, and service-role boundaries are not defined. | App-layer checks alone are not enough for Supabase safety. | Add a security boundary section covering route guards, table-level RLS, and service-role-only operations. | `§4.2`, `§5`, `§6`, `§7`, `§10`, `§13` | Technical decision, schema change, API change, test plan change | Resolved in main PRD |
| P0-3 | Worker create/delete flow assumes app-table cascades solve `auth.users` lifecycle. Tied to `UD-03`. | This risks orphaned auth accounts and inconsistent sessions. | Rewrite worker lifecycle rules for create, deactivate/archive-first, and session invalidation using explicit privileged flows. Also remove hard delete UI from v1 text. | `§3.7`, `§6.1`, `§7.4`, `§12.2`, `§14` | Product decision, technical decision, schema change, API change, test plan change | Resolved in Release 0 decision |
| P0-4 | State-machine rules are scattered and inconsistent. Tied to `UD-07`, `UD-08`, `UD-09`. | Tracker, cron, attendance, and records will drift without one canonical rule set. | Add a single truth table for manual actions, automatic transitions, side effects, and idempotency, using the approved `ALPHA`, `LEMBUR`, and `BREAK_LATE` rules. | `§3.4`, `§3.10`, `§5.2-5.3`, `§8`, `§12.1`, `§13.2-13.3` | Product decision, technical decision, API change, test plan change | Resolved in Release 0 decision |
| P0-5 | Source of truth for current state, daily attendance, monthly records, `cuti_stock`, and overrides is not locked. | Admin edits and cron jobs can conflict or double-write. | Add a source-of-truth matrix that defines field ownership and override precedence. | `§3.5-3.6`, `§6.2-6.5`, `§8.3`, `§12.3` | Technical decision, schema change, API change, test plan change | Resolved in main PRD |
| P0-6 | Derived realtime behavior for `LATE` and `ALPHA` is underspecified. | Derived states do not emit row-change events by themselves. | Add a derived-status strategy covering server snapshot responsibility, client recompute, reconnect reconciliation, and cache patching. | `§3.3-3.4`, `§4.1`, `§5.2-5.3`, `§7.1`, `§12.4-12.5`, `§13` | Technical decision, API change, test plan change | Resolved in main PRD |
| P0-7 | Auditability is required, but only permission changes have a log model. | High-risk admin actions cannot be reconstructed or reviewed. | Add a general `audit_logs` model and required coverage list for all sensitive mutations. | `§2.1`, `§3.5-3.8`, `§6.12`, `§12`, `§13` | Schema change, API change, test plan change | Resolved in main PRD |

## P1 Should Fix Before Development

| Item | Problem | Why it matters | Recommended PRD change | Affected PRD sections | Change type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P1-1 | FAQ is treated as CRUD content, but the model is too loose. Tied to `UD-05`. | The CMS contract is not stable enough for validated CRUD. | Replace `landing_content.faq.*` with a dedicated FAQ rows/table model. | `§3.2`, `§6.8`, `§7.7`, `§11` | Schema change, API change, test plan change | Resolved in main PRD |
| P1-2 | Absensi includes `Custom Text` and future scheduling without matching schema/API support. Tied to `UD-06`. | UI scope and data model will diverge immediately. | Remove `Custom Text` and future scheduling from v1 PRD text and tests. | `§3.5`, `§6.4`, `§7.2`, `§12.1`, `§12.3` | Product decision, schema change, API change, test plan change | Resolved in main PRD |
| P1-3 | Index strategy is missing for frequent joins, filters, and cascades. | Performance targets will be fragile and deletion/cascade costs may spike. | Add a schema appendix listing required indexes before migration freeze. | `§4.1`, `§6`, `§12.5` | Schema change, technical decision | Open |
| P1-4 | Mutation security controls are too narrow. | Sensitive admin endpoints still need rate limiting, input policy, and session-mode clarity. | Expand security requirements beyond login to sensitive admin mutations and media/URL validation rules. | `§4.2`, `§7`, `§11`, `§12`, `§13` | Technical decision, API change, test plan change | Open |
| P1-5 | Request-guard wording is too tied to one framework filename. | It may age badly if Next file conventions shift. | Reword the PRD to require a framework-current request-guard layer instead of a hardcoded file name. | `§5.1`, `§10.2`, `§15` | Technical decision | Resolved in main PRD |
| P1-6 | Landing and admin visual rules are not clearly separated. | A task-heavy ops UI should not inherit the same emphasis as a brand surface. | Split UI guidance into `brand surface` and `product surface` rules. | `§9`, `§11`, `§15` | Product decision, technical decision | Open |
| P1-7 | Seed/default rows are not defined. | The system cannot be initialized consistently across environments. | Add a seed plan for owner bootstrap, settings, permission defaults, and base landing content. | `§6.7-6.8`, `§6.11`, `§14` | Schema change, technical decision, test plan change | Open |
| P1-8 | The roadmap is too optimistic for the current amount of unresolved logic. | It encourages development on unstable assumptions. | Replace the phase plan with release slices gated by frozen decisions. | `§14` | Product decision, technical decision | Open |

## P2 Can Defer to Later Sprint

| Item | Problem | Why it matters | Recommended PRD change | Affected PRD sections | Change type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P2-1 | Cache invalidation is path-based only. | It works for v1, but is broader than necessary. | Keep `revalidatePath('/')` for v1 and note tag-level invalidation as a later refinement. | `§5.4`, `§11.2` | Technical decision | Open |
| P2-2 | Cron observability is limited to logs. | Useful for debugging, but not a freeze blocker. | Add optional cron-run observability as a later hardening item. | `§3.10`, `§4.4`, `§12.4` | Schema change, test plan change | Open |
| P2-3 | Loading, empty, stale, and reconnect states are not standardized. | This affects polish and operator confidence more than freeze readiness. | Add a short UI states appendix after the product model is frozen. | `§9`, `§12.4` | Product decision, test plan change | Open |
| P2-4 | Public content APIs may be broader than the internal app needs. | This is a maintainability concern, not a freeze blocker. | Mark public read APIs as optional integration endpoints, not the default internal data path. | `§5.4`, `§7.7`, `§15` | Technical decision, API change | Open |

## Out of Scope / Future Version

| Item | Problem | Why it matters | Recommended PRD change | Affected PRD sections | Change type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F-1 | Authenticated `Customer` accounts add scope without clear v1 value. Tied to `UD-01`. | Better deferred unless customer-side features are defined. | Move authenticated customer accounts to `Future Version`. | `§1.3`, `§3.1`, `§10`, `§14`, `§15` | Product decision | Approved for Future Version |
| F-2 | Future-dated attendance scheduling adds time-travel logic. Tied to `UD-06`. | It complicates attendance truth and cron interaction. | Move future scheduling to `Future Version`; keep v1 to present/past correction only. | `§3.5`, `§12.1` | Product decision, API change | Approved for Future Version |
| F-3 | Configurable Access Manager UI may be unnecessary for launch. Tied to `UD-04`. | Hardcoded defaults are safer if freeze scope remains unstable. | Defer configurable Access Manager UI from v1 and use a documented static permission matrix. | `§3.8`, `§6.11`, `§7.6`, `§14` | Product decision, technical decision | Approved for Future Version |
| F-4 | Hard delete UI is high risk for a first release. Tied to `UD-03`. | Archive/deactivate is usually safer operationally. | Remove hard delete UI from v1 and keep archive/deactivate-first. | `§3.7`, `§6.1`, `§7.4`, `§12.2` | Product decision, schema change, API change | Approved for Future Version |

## Unresolved Decision Register

### UD-01 Authenticated `Customer` in v1: keep or remove
- Recommended default: remove authenticated `Customer` from v1 and treat buyers as public anonymous users.
- Approved PRD decision: Remove authenticated `Customer` from v1. Buyers remain public anonymous users.

### UD-02 Member visibility model: `self-only` vs broader read access
- Recommended default: `Member` is `self-only` for tracker, records, and profile.
- Approved PRD decision: `Member` is self-only for tracker, records, and profile.

### UD-03 Worker lifecycle: `hard delete` vs `archive/deactivate-first`
- Recommended default: prefer `archive/deactivate-first` for v1 and reserve hard delete for privileged back-office handling.
- Approved PRD decision: Use archive/deactivate-first for worker lifecycle in v1. Do not ship hard delete UI in v1.

### UD-04 Access Manager UI: keep in v1 or defer
- Recommended default: defer configurable Access Manager UI if scope is still unstable at freeze time.
- Approved PRD decision: Defer configurable Access Manager UI from v1. Use a documented static permission matrix for v1.

### UD-05 FAQ model: dedicated rows/table vs structured JSON contract
- Recommended default: prefer dedicated FAQ rows or a dedicated FAQ table for validated CRUD.
- Approved PRD decision: Use dedicated FAQ rows/table for validated FAQ CRUD.

### UD-06 Absensi `Custom Text` and future scheduling in v1
- Recommended default: remove `Custom Text` and future scheduling from v1.
- Approved PRD decision: Remove Absensi `Custom Text` and future scheduling from v1.

### UD-07 `ALPHA` correction path: tracker vs absensi/admin correction only
- Recommended default: remove tracker-based `ALPHA -> START`; use absensi/admin correction flow only.
- Approved PRD decision: Remove tracker-based `ALPHA -> START`. `ALPHA` corrections must go through Absensi/Admin correction flow only.

### UD-08 `LEMBUR` accumulation and rounding rule
- Recommended default: accumulate in one internal unit, then round only at reporting boundaries.
- Approved PRD decision: Accumulate `LEMBUR` in one internal unit and round only at reporting boundaries.

### UD-09 `BREAK_LATE` idempotency rule
- Recommended default: record `BREAK_LATE` once per break episode after the threshold is crossed.
- Approved PRD decision: Record `BREAK_LATE` once per break episode after the threshold is crossed.

Freeze note: PRD v1 frozen after Release 0 amendments. Future changes must be tracked as amendments or v1.x revisions.
