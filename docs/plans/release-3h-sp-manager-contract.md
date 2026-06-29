# Release 3H: SP Manager Contract

## Status

Planning slice only. No migration, RPC, or UI is introduced in this release.
PRD v1 is frozen.

## Goal

Define the exact rules, data model, lifecycle, and revocation constraints for the SP (Surat Peringatan / Warning Letter) system used within the Users Manager feature.

---

## What is SP?

SP (Surat Peringatan) is an administrative warning letter issued to a worker by an Owner or Admin. It is a formal disciplinary record. SPs are time-limited and can be revoked before expiry.

---

## Actor Permissions

| Actor   | Issue SP | Revoke SP | View SP |
|---------|:---:|:---:|:---:|
| owner   | ✅ | ✅ | ✅ (all workers) |
| admin   | ✅ | ✅ | ✅ (all workers) |
| member  | ❌ | ❌ | ❌ |

---

## Data Model

Table: `public.worker_sp_logs`

| Column        | Type        | Description                                           |
|---------------|-------------|-------------------------------------------------------|
| `id`          | `uuid`      | Primary key                                           |
| `user_id`     | `uuid`      | References `public.users.id`                          |
| `sp_level`    | `integer`   | SP tier: 1, 2, or 3 (SP-1, SP-2, SP-3)              |
| `reason`      | `text`      | Mandatory reason for the SP                           |
| `issued_by`   | `uuid`      | Staff user who issued the SP                          |
| `issued_at`   | `timestamptz` | When the SP was created                             |
| `expires_at`  | `timestamptz` | When the SP expires (mandatory, set at issue time)  |
| `revoked_by`  | `uuid`      | Staff user who revoked the SP (null if not revoked)  |
| `revoked_at`  | `timestamptz` | When the SP was revoked (null if not revoked)       |

---

## Active SP Derivation

An SP is considered **active** if and only if **all** of the following conditions are met:

```sql
expires_at > NOW()
AND revoked_at IS NULL
AND revoked_by IS NULL
```

An expired SP (`expires_at <= NOW()`) is automatically **inactive** — no action required.
A revoked SP (`revoked_at IS NOT NULL`) is permanently **inactive** regardless of `expires_at`.

---

## Issuance Rules

- `sp_level` must be 1, 2, or 3.
- `reason` is mandatory and must not be empty.
- `expires_at` must be explicitly set at issue time and must be a future timestamp.
- `issued_by` is set server-side from the authenticated caller's `user_id`.
- The same worker can have multiple active SPs (no uniqueness constraint per level).

---

## Revocation Rules

Revocation permanently deactivates an SP before its natural expiry.

- Revocation sets both `revoked_by` and `revoked_at` in a single atomic update.
- `revoked_by` is set server-side from the authenticated caller's `user_id`.
- `revoked_at` is set to `NOW()` server-side.
- Revocation is **irreversible** — once revoked, an SP cannot be un-revoked.
- Revocation of an already-expired SP is allowed but has no practical effect.
- Hard deletion of SP records is OUT OF SCOPE for v1.

---

## Expected RPC Signatures

```sql
-- Issues a new SP for a worker
issue_worker_sp(
  p_target_user_id uuid,
  p_sp_level integer,       -- 1, 2, or 3
  p_reason text,
  p_expires_at timestamptz
) RETURNS uuid -- returns new sp log id

-- Revokes an existing active SP
revoke_worker_sp(
  p_sp_id uuid
) RETURNS void
```

---

## Expected Error Codes

| Code | Description |
|------|-------------|
| `sp.unauthorized` | Caller is not owner or admin |
| `sp.invalid_target` | Target user_id not found or is_deleted |
| `sp.invalid_level` | sp_level not in (1, 2, 3) |
| `sp.missing_reason` | reason is empty or null |
| `sp.invalid_expires_at` | expires_at is in the past |
| `sp.already_revoked` | SP already has revoked_at set |
| `sp.not_found` | sp_id does not exist |

---

## Audit Requirements

Every SP issuance and revocation must write to `audit_logs`. This is fail-closed.
