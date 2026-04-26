# Bulk User Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare a safe, auditable path to bootstrap the approved 77 staff auth users without committing plaintext credentials.

**Architecture:** The approved plaintext source CSV remains local-only at `.local/bulk-user-bootstrap-preview.csv`. A later dry-run script should validate that CSV without writing data, and a later import command should create Supabase Auth users first, then insert matching application rows using the returned auth IDs.

**Tech Stack:** Supabase Auth Admin API, Supabase service-role server context, Postgres tables `public.users`, `worker_profiles`, `worker_status`, and `audit_logs`.

---

## 1. Purpose

This document captures the approved bulk user bootstrap plan in a sanitized, commit-safe form. It defines counts, mappings, CSV shape, validation rules, and the later import flow for Kireiku App v1 staff accounts.

The approved plaintext CSV preview exists locally at `.local/bulk-user-bootstrap-preview.csv`. That file contains initial passwords and must remain local-only.

## 2. Security Warning

- The plaintext CSV is local-only and is ignored through `.git/info/exclude`.
- Never commit plaintext password files, screenshots, logs, generated previews, terminal output dumps, or audit payloads containing initial passwords.
- Do not include plaintext passwords in tracked docs, tickets, PR descriptions, audit logs, application logs, or database rows outside Supabase Auth credential storage.
- Use the Supabase service-role key only in a trusted server or CLI environment. Never expose it in browser code or `NEXT_PUBLIC_*` environment variables.
- Rotate initial passwords or force password reset after first login if operational policy requires it.

## 3. Count Reconciliation

- Total auth users: 77
- Owners: 2
- Workers: 75
- Tiers: owner 2, admin 3, member 72
- Roles: Professional Player 30, Internship 31, Expert Player 8, Customer Service 3, Explorer 1, Security 1, Cleaning Service 1

## 4. CSV Schema

The local-only CSV columns are:

```csv
name,email,password,tier,is_deleted,avatar_initials,gid,employee_role,shift,shift_start,shift_end,is_flexible,show_card,cuti_stock
```

Column handling:

- `name`: uppercase display name from the approved bootstrap list.
- `email`: lowercase `name@kireiku.app`.
- `password`: present only in the local-only CSV; do not copy values into tracked files.
- `tier`: one of `owner`, `admin`, or `member`.
- `is_deleted`: `false` for all 77 users.
- `avatar_initials`: generated initials only; no avatar URL is required.
- `gid`: populated only for workers, from `KRU-001` through `KRU-075`.
- `employee_role`, `shift`, `shift_start`, `shift_end`, `is_flexible`, `show_card`, `cuti_stock`: worker profile fields; blank for owners.

## 5. Role/Tier Mapping

- MUALIF and GILANG: `tier=owner`, no worker profile by default.
- Customer Service: `tier=admin`.
- Professional Player: `tier=member`.
- Expert Player: `tier=member`.
- Internship: `tier=member`.
- Explorer: `tier=member`.
- Security: `tier=member`.
- Cleaning Service: `tier=member`.

## 6. Shift Mapping

- Shift A: `06:00` to `14:00`
- Shift B: `08:00` to `16:00`
- Shift C: `14:00` to `22:00`
- Shift D: `16:00` to `00:00`
- Shift E: `22:00` to `06:00`
- Shift F: `00:00` to `08:00`
- Shift 1: `07:00` to `15:00`
- Shift 2: `15:00` to `23:00`
- Shift 3: `23:00` to `07:00`
- Flexible: `shift=flexible`, `is_flexible=true`, empty `shift_start`, empty `shift_end`

## 7. GID Strategy

- Assign `KRU-001` through `KRU-075` to workers only.
- Owners do not receive a GID by default.
- GIDs identify workers stably and must not encode role, shift, tier, schedule, or future assignment state.
- GIDs must remain stable if a worker changes role, shift, or tier later.

## 8. Avatar Initials Rule

- For single-word names, use the first two letters of the name in uppercase.
- Examples by rule shape only: `MUALIF` becomes `MU`, `GILANG` becomes `GI`, and `EDI` becomes `ED`.
- For future multi-word names, use the first letter of the first two words in uppercase.

## 9. Password Rule

Worker initial passwords follow this rule:

- Start with the fixed prefix and suffix pattern `!K1re1ku.<NameTransformed>!`.
- Convert the approved worker name to Title Case for `<NameTransformed>`.
- Preserve the first character of `<NameTransformed>`.
- After the first character only, replace `a` or `A` with `4`.
- After the first character only, replace `i` or `I` with `1`.
- Do not list generated worker passwords in tracked files.

Owner initial password values are present only in the local-only CSV and must not be copied into this document or other tracked artifacts.

## 10. Import Flow For Later

- Create `auth.users` through the Supabase Auth Admin API using a service-role client in a trusted server or CLI-only environment.
- Insert `public.users` rows with the auth user ID returned by Supabase Auth, matching `name`, `email`, `tier`, and `is_deleted=false`.
- Insert `worker_profiles` for the 75 worker rows only, including `employee_role`, stable `gid`, shift fields, `is_flexible`, `show_card=true`, and `cuti_stock=2`.
- Insert default `worker_status` rows for the 75 worker rows only, with status initialized to `off` and default counters/flags.
- Write `audit_logs` for the bootstrap operation with counts, source file metadata, actor, target domain, and result summary. Audit payloads must never contain plaintext passwords.

## 11. Validation Checklist

- [ ] Local CSV path exists: `.local/bulk-user-bootstrap-preview.csv`.
- [ ] `.local/` remains ignored locally or is explicitly gitignored before any plaintext CSV is generated.
- [ ] CSV has 78 lines: 1 header plus 77 user rows.
- [ ] Total auth users equals 77.
- [ ] Owners equal 2.
- [ ] Workers equal 75.
- [ ] Tiers reconcile to owner 2, admin 3, member 72.
- [ ] Role counts reconcile to Professional Player 30, Internship 31, Expert Player 8, Customer Service 3, Explorer 1, Security 1, Cleaning Service 1.
- [ ] Emails are unique.
- [ ] Worker GIDs are unique and cover `KRU-001` through `KRU-075`.
- [ ] Shifts are limited to `A`, `B`, `C`, `D`, `E`, `F`, `1`, `2`, `3`, and `flexible`.
- [ ] Customer Service rows use `tier=admin`.
- [ ] Non-Customer-Service worker rows use `tier=member`.
- [ ] Internship count equals 31.
- [ ] Flexible rows use `shift=flexible`, `is_flexible=true`, and empty shift times.
- [ ] Owner rows have blank worker profile fields by default.
- [ ] Avatar initials are exactly two uppercase letters for all current rows.
- [ ] Tracked files do not contain plaintext password values from the local CSV.

## 12. Future-Proofing For Role/Shift Changes

- `employee_role` and `shift` in `worker_profiles` represent current assignments, not permanent identity.
- Stable identity should come from auth ID, `public.users`, and worker GID, not from role or shift.
- Future role, tier, and shift changes should write `audit_logs` with actor, target, old values, new values, reason, and timestamp.
- A future assignment history table can be added later if the app needs point-in-time role/shift reporting beyond audit logs.

## 13. Next Implementation Step

Create a dry-run import script that validates `.local/bulk-user-bootstrap-preview.csv` without writing data. The script should parse the CSV, run the validation checklist above, redact passwords from all output, and exit nonzero on any mismatch.
