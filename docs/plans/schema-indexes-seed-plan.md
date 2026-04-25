# Schema, Indexes, And Seed Plan

Purpose: freeze the minimum schema corrections, index expectations, and bootstrap data needed before development starts.

## Current PRD Baseline

This document clarifies `§4.1`, `§4.3`, `§6`, `§7`, `§11`, `§12.3`, and `§14`.

## Source-Of-Truth Matrix

| Field group | Source of truth | Primary write path | Read behavior | Notes |
| --- | --- | --- | --- | --- |
| `worker_status` | Current operational state | Tracker actions and cron writes | Read as live operational state | Holds stored status only, not `LATE` |
| `worker_attendance` | Daily attendance truth | Absensi edits plus approved tracker/cron side effects | Read as per-day truth | One row per worker per date |
| `worker_records` | Monthly aggregate and reporting snapshot | System aggregation plus owner/admin overrides | Read for monthly summaries | Override fields must block blind auto-recalc |
| `worker_profiles.cuti_stock` | Recommended default: canonical current leave balance | Approved leave/correction flows | Read as current balance | Needs final lock with monthly snapshot behavior |
| `worker_records.cuti_stock` | Monthly reporting snapshot | Month initialization and approved corrections | Read for historical month view | Should not replace canonical current balance |
| Override fields in `worker_records` | Manual lock on a metric | Owner/Admin override flow | Prefer override over auto aggregate on read | Prevents silent recalculation drift |

## Required Pre-Freeze Schema Changes

| Change | Why it is needed | PRD action | Linked decision |
| --- | --- | --- | --- |
| Add general `audit_logs` model | Current logging only covers permission changes | Add one audit model and coverage list to the PRD | none |
| Freeze FAQ model | Current FAQ CRUD shape is too loose | Add dedicated FAQ rows/table for validated CRUD | `UD-05` |
| Freeze actor/tier model | Tier set may be too broad for v1 | Update schema language to match the approved v1 actor model and remove authenticated customer from v1 scope | `UD-01` |
| Add archive/deactivate support | Hard delete is risky for first release | Add archive/deactivate fields and flow; do not ship hard delete UI in v1 | `UD-03` |
| Clean up absensi scope | `Custom Text` and future scheduling do not match current schema | Remove them from v1 schema/API assumptions | `UD-06` |

## Required Indexes

| Index group | Minimum expectation | Notes |
| --- | --- | --- |
| FK `user_id` references | Confirm indexed coverage for every FK side used in joins/cascades | `worker_attendance`, `worker_sp`, `worker_records`, `worker_status`, `worker_profiles`, audit tables |
| Permission lookup | `(tier, resource, action)` | Existing unique constraint can satisfy lookup if preserved |
| Worker filtering | `shift`, `employee_role`, `show_card`, and status-supporting fields used in admin filters | Final mix depends on approved tracker query shape |
| Active/visible landing queries | `services(is_active, sort_order)` and `testimonials(is_visible, sort_order)` | Supports public landing reads and admin ordering |
| Active SP lookups | `worker_sp(user_id, expires_at)` plus active-state filtering support | Needed for worker cards and profile summaries |

## Seed / Default Data Plan

| Seed item | Minimum content | Notes |
| --- | --- | --- |
| Owner bootstrap | One initial owner account plus matching app rows | Must use privileged flow |
| `app_settings` defaults | `system_reset_at`, `cron_last_run`, and any required operational defaults | Keep the required set minimal |
| Default permission matrix | Owner full access, Admin/Member defaults aligned to approved v1 scope | `Member` is self-only and configurable Access Manager UI is deferred |
| Base landing content rows | Hero, stats, why, how-it-works, footer baseline content keys | FAQ content moves to dedicated FAQ rows/table |
| Services/testimonials starter state | Empty-but-valid or minimal moderated examples | Keep public reads safe even when empty |

## Migration Safety Notes

- Keep schema changes and seed data in separate steps.
- Use idempotent migration patterns for constraints and default data.
- Seed privileged bootstrap data only after base schema exists.
- Do not rely on implicit cascades to manage `auth.users` lifecycle.

## Unresolved Decisions

### UD-01 Authenticated `Customer` in v1: keep or remove
- Recommended default: drop the `customer` tier from v1 schema if authenticated customer accounts are removed.
- Approved PRD decision: Remove authenticated `Customer` from v1. Buyers remain public anonymous users.

### UD-03 Worker lifecycle: `hard delete` vs `archive/deactivate-first`
- Recommended default: add archive/deactivate support before considering hard delete UI.
- Approved PRD decision: Use archive/deactivate-first for worker lifecycle in v1. Do not ship hard delete UI in v1.

### UD-05 FAQ model: dedicated rows/table vs structured JSON contract
- Recommended default: prefer dedicated FAQ rows/table for validated CRUD.
- Approved PRD decision: Use dedicated FAQ rows/table for validated FAQ CRUD.

### UD-06 Absensi `Custom Text` and future scheduling in v1
- Recommended default: remove `Custom Text` and future scheduling from v1.
- Approved PRD decision: Remove Absensi `Custom Text` and future scheduling from v1.
