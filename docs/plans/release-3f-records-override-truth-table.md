# Release 3F Records Override Truth Table

## Allowed Transitions

| State Before | Action | State After |
|---|---|---|
| `NULL` | Set Value | `Value` |
| `Value` | Set New Value | `New Value` |
| `Value` | Clear Override | `NULL` |

## Forbidden Rules

- Negative values rejected.
- Invalid field names rejected.

## Side Effects

Every successful override mutation has the following side effects:
- Updates `worker_records.updated_at`.
- Inserts to `worker_records_override_log`.
- Inserts to `audit_logs`.
