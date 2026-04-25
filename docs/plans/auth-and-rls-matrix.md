# Auth And RLS Matrix

Purpose: lock the security boundary for PRD freeze without rewriting the main PRD.

## Current PRD Baseline

This document clarifies `§1.3`, `§3.1`, `§4.2`, `§5`, `§6`, `§7`, `§10`, `§12.2`, and `§13.1`.

## Actor Definitions

- `Public`: anonymous buyer-facing visitor on `/`.
- `Owner`: highest-privilege staff actor with full operational access.
- `Admin`: operational staff actor with broad admin access but not owner-only powers.
- `Member`: worker/staff actor with self-only access for tracker, records, and profile in v1.
- `Customer`: removed from authenticated v1 scope; buyers remain public anonymous users.

## Auth Modes In v1

- Public anonymous access for landing-page reads.
- Staff authentication for `Owner`, `Admin`, and `Member`.
- No authenticated `Customer` flow in v1.

## Route Access Matrix

| Route | Public | Owner | Admin | Member | Customer (if retained) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Allow | Allow | Allow | Allow | Allow | Public marketing surface |
| `/admin` | Redirect to `/admin/login` | Redirect to first allowed admin page | Redirect to first allowed admin page | Redirect to first allowed member-allowed page | n/a | Member scope is self-only in v1 |
| `/admin/login` | Allow | Redirect if already authenticated | Redirect if already authenticated | Redirect if already authenticated | Redirect to `/` if customer auth exists | Staff login only |
| `/admin/dashboard` | Deny | Allow | Allow | Deny | n/a | Dashboard remains staff-management oriented |
| `/admin/tracker` | Deny | Allow | Allow | Allow, self-only data only | n/a | `Member` sees own tracker state only |
| `/admin/absensi` | Deny | Allow | Allow | Deny | n/a | Corrections remain owner/admin only |
| `/admin/records` | Deny | Allow | Allow | Allow, self-only data only | n/a | `Member` sees own records only |
| `/admin/users` | Deny | Allow | Allow | Deny | Deny | Staff-management only |
| `/admin/content` | Deny | Allow | Allow | Deny | Deny | CMS only |
| `/admin/access-manager` | Deny | Deny in shipped v1 UI | Deny | Deny | n/a | Configurable UI deferred from v1; documented static matrix only |
| `/admin/profile` | Deny | Allow | Allow | Allow | Deny | Member can always access own profile |
| `/admin/profile/[userId]` | Deny | Allow | Allow | Redirect to own profile | n/a | `Member` cannot view other users |

## RLS / Data Access Matrix

Legend: `O=Owner`, `A=Admin`, `M=Member`, `P=Public`, `C=Customer if retained`.

| Table | Read | Insert | Update | Delete | Service-role only | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | `O/A all`, `M self`, `P none`, `C self only if retained` | none | `O/A limited`, `M self-limited` | none | worker create, disable, delete | App profile table should not be treated as auth lifecycle owner |
| `worker_profiles` | `O/A all`, `M self`, `P none` | `O/A via privileged path` | `O/A`, `M self-limited if allowed` | none | bootstrap with worker create | `Member` is self-only in v1 |
| `worker_status` | `O/A all`, `M self`, `P none` | privileged/bootstrap | `O/A manual + cron`, `M none by default` | none | bootstrap, resets if privileged | Derived status still computed separately |
| `worker_attendance` | `O/A all`, `M self if retained`, `P none` | `O/A/manual`, cron/system | `O/A`, system, cron | none | correction jobs if needed | Daily attendance truth |
| `worker_records` | `O/A all`, `M self if retained`, `P none` | system/bootstrap | `O/A overrides`, system aggregation | none | reset jobs if privileged | Monthly aggregate/snapshot |
| `worker_sp` | `O/A all`, `M self-read`, `P none` | `O/A` | `O/A revoke only` | none | none | Active status is derived from expiry/revoke flags |
| `access_permissions` | `O read`, `A read optional`, `M none`, `P none` | none in shipped v1 UI | none in shipped v1 UI | none in shipped v1 UI | default seeding/reset if needed | Static permission matrix for v1; configurable UI deferred |
| `access_logs` | `O read`, `A read optional`, `M none`, `P none` | system only | none | none | none | Existing permission-change log |
| `audit_logs` (proposed) | `O read`, `A read filtered`, `M none`, `P none` | system only | none | none | none | Needed for non-permission audit coverage |
| `app_settings` | `O read`, `A limited read`, `M none`, `P none` | none | privileged/system only | none | reset/cron bootstrap | Includes reset and cron coordination keys |
| `landing_content` | `P read public subsets`, `O/A read all` | `O/A` | `O/A`, footer owner-only | `O/A limited` | none | FAQ moves to dedicated rows/table per `UD-05` |
| `services` | `P read active`, `O/A read all` | `O/A` | `O/A` | `O/A or archive` | none | Prefer archive/soft-hide patterns over destructive delete in v1 |
| `testimonials` | `P read visible`, `O/A read all` | `O/A` | `O/A` | `O/A or archive` | none | Moderated visibility remains owner/admin concern |

## Privileged Operations

| Operation | Recommended boundary | Notes |
| --- | --- | --- |
| Worker account creation | Service-role only | Creates auth user plus app rows as one privileged flow |
| Worker disable/delete | Service-role only | v1 uses archive/deactivate-first; no hard delete UI |
| Owner bootstrap | Service-role only | Seed first owner and base settings safely |
| Permission reset/bootstrap | Owner or service-role | v1 ships with documented static permission matrix |

## Unresolved Decisions

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
