# Release 3A Absensi Read-Only Closure Note

## Status

- Release 3A is merged into `main`.
- PR merged and closed.
- Local and remote feature branches cleaned up.
- Worktree clean after post-merge verification.

Merge commit: `457cac1 Merge pull request #2 from mualep/codex/r3a-absensi-readonly`

Implementation commit: `d6df557 feat: add read-only absensi month grid`

## Scope Implemented

- Added `/admin/absensi`.
- Added read-only monthly attendance grid.
- Owner/Admin can view all active, visible, non-deleted workers.
- Member can access Absensi with self-only data.
- Added Absensi nav entry for Owner/Admin and Member.
- Added loading/error route boundaries.
- Added Absensi data/helper layer.
- Added static guardrail test `test:absensi-readonly`.

## Data Rules

- Reads from `worker_profiles`, `users`, and `worker_attendance`.
- Filters `worker_profiles.show_card = true`.
- Excludes deleted users.
- Ignores canceled attendance rows with `is_canceled=false`.
- Uses normal Supabase authenticated user client.
- No service-role/admin client.

## Guardrails Preserved

- R3A is read-only only.
- No Absensi edit/correction mutation.
- No Server Action.
- No RPC mutation.
- No insert/update/upsert/delete path.
- No schema/migration.
- No `worker_records` query.
- `LATE` is not an attendance cell status.
- Member remains self-only.
- PRD v1 remains frozen.

## QA and Verification

Post-merge verification passed:

- `npm run test:absensi-readonly`
- `npm run test:worker-attendance-records-schema`
- `npm run test:tracker-readonly`
- `npm run test:tracker-rpc-behavior`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

Manual QA summary:

- Unauthenticated `/admin/absensi` redirects to login.
- Owner/Admin access passed.
- Member self-only access passed.
- No edit/correction/save/reset controls appeared.

## Review Notes

Closure review found and fixed one issue before merge:

- Owner/Admin Absensi initially included hidden/inactive worker profiles.
- Fixed by filtering `worker_profiles.show_card = true`, matching tracker visible-worker behavior.

## Known QA Limitation

- Local June 2026 data had zero active `worker_attendance` rows, so status labels such as `HADIR`, `CUTI`, `SAKIT`, `PENDING`, and `ALPHA` could not be visually observed from local data.
- This is a data-limited QA note, not a confirmed defect.

## Deferred / Out of Scope

- Absensi edit/correction.
- `ALPHA` correction.
- Records UI.
- Dashboard/profile completion.
- `LEMBUR` flows.
- Cron/realtime.
- Future scheduling.
- Customer account/auth.
