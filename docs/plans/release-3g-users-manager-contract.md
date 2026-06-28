# Release 3G: Users Manager Contract

## Status

Planning slice only. No migration, RPC, or UI is introduced in this release.
PRD v1 is frozen.

## Goal

Define the exact rules, actor permissions, data boundaries, and privileged flow requirements for the `/admin/users` Users Manager feature. This contract governs all subsequent implementation slices (database migrations, RPCs, Server Actions, and UI).

---

## Actor Permissions

| Actor   | Create Worker | Edit Profile | Manage SP | Deactivate Worker | View All Workers |
|---------|:---:|:---:|:---:|:---:|:---:|
| owner   | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin   | ✅ | ✅ | ✅ | ✅ | ✅ |
| member  | ❌ | ❌ | ❌ | ❌ | ❌ (self-only via existing profile page) |

Members must be denied at the Server Action level before any DB interaction.

---

## Privileged Creation Flow (Service-Role Only)

Creating a worker requires a **Service-Role only flow**. Client-side direct inserts are strictly forbidden.

### Why Service Role is Required

Creating a worker requires atomic writes to:
1. `auth.users` (Supabase Auth) — inaccessible from the regular `anon`/`authenticated` role.
2. `public.users` — references `auth.users.id`.
3. `public.worker_profiles` — references `public.users.id`.

All three must succeed atomically. Failure at any step must roll back the others.

### Implementation Contract

- An RPC function `create_worker(name, email, password, employee_role, gid, shift, cuti_stock)` must be called with the **Supabase Admin client** (service role key) — never the standard `createClient()`.
- The Admin client must only be instantiated server-side inside `lib/supabase/admin.ts` using `SUPABASE_SERVICE_ROLE_KEY`.
- The Server Action `createWorker` in `app/admin/(shell)/users/actions.ts` must:
  1. Authenticate the calling staff and verify tier is `owner` or `admin`.
  2. Call the RPC using the Admin client.
  3. Return structured result (`{ ok, error?, data? }`).
- The service role key must never appear in client components or be passed through props.

---

## Allowed Profile Fields (PRD v1 — Frozen)

The following fields are the only editable profile fields in v1:

| Field           | Table             | Notes                            |
|-----------------|-------------------|----------------------------------|
| `name`          | `public.users`    | Worker display name              |
| `email`         | `auth.users`      | Requires Auth Admin API          |
| `employee_role` | `worker_profiles` | Must match `WorkerRole` enum     |
| `gid`           | `worker_profiles` | Must match `KRU-###` format      |
| `shift`         | `worker_profiles` | Must match `WorkerShift` enum    |
| `cuti_stock`    | `worker_profiles` | Integer >= 0                     |
| `show_card`     | `worker_profiles` | Boolean: controls visibility     |

Password changes are handled via Supabase Auth Admin API (reset/set password), not direct DB writes.

---

## Deactivation Flow (Soft-Delete via `is_deleted`)

### Archive-First Policy (archive/deactivate-first)

Hard deletion of workers is **OUT OF SCOPE for v1**. The only legal deactivation path is soft-delete:

1. Set `is_deleted = true` on `public.users`.
2. Set `show_card = false` on `worker_profiles` (hides from all operational views).
3. Do NOT remove the row from `auth.users` or `public.users`.
4. Do NOT remove `worker_profiles`, `worker_records`, or `worker_attendance` rows.

This preserves the historical audit trail and all attendance/records data for the deactivated worker.

### Reactivation

A deactivated worker can be reactivated by setting `is_deleted = false` and `show_card = true`. This must be an explicit admin action.

---

## Expected RPC Signatures

```sql
-- Creates auth user + public.users + worker_profiles atomically (service role only)
create_worker(
  p_name text,
  p_email text,
  p_password text,
  p_employee_role text,
  p_gid text,
  p_shift text,
  p_cuti_stock integer
) RETURNS uuid -- returns new user_id

-- Soft-deletes a worker (archive-first)
deactivate_worker(p_target_user_id uuid) RETURNS void

-- Reactivates a previously deactivated worker
reactivate_worker(p_target_user_id uuid) RETURNS void
```

---

## Expected Error Codes

| Code | Description |
|------|-------------|
| `users.unauthorized` | Caller is not owner or admin |
| `users.email_taken` | Email already exists in auth.users |
| `users.gid_taken` | GID already exists in worker_profiles |
| `users.invalid_role` | employee_role not in allowed enum |
| `users.invalid_shift` | shift not in allowed enum |
| `users.invalid_target` | Target user_id not found or already deleted |

---

## Audit Requirements

Every create, edit, and deactivate action must write to `audit_logs`. This is fail-closed: if the audit log write fails, the primary transaction must roll back.
