# V1.x Deferred Feature Requests

## Status

Tracked ideas and requests that are explicitly **out of scope for KireiApp PRD v1**.
These are preserved here for direct implementation in v1.x or v2.

---

## Records Override — Delta/Cumulative Adjustment

**Request Summary:**
Change the Records Manual Override architecture from an **Absolute Lock** model to a **Delta/Cumulative Adjustment** model.

**Current Behavior (V1 Absolute Lock):**
When an Admin/Owner sets a manual override on a record field (e.g., `alpha_override_count = 3`), the system stores this as an absolute value. It completely replaces any auto-aggregated calculation. The override "locks" the value until explicitly cleared (`null`).

**Requested Behavior (v1.x Delta Adjustment):**
An override should be able to represent a *delta* — an additive or subtractive adjustment on top of the system's ongoing auto-aggregated calculation. Example: if the auto-aggregate calculates Alpha = 2, and an Admin applies a delta of +1, the effective value becomes 3. If the system later recalculates Alpha = 4, the effective value would become 5 (4 + 1), without requiring the Admin to re-lock.

**Why Deferred:**
- Requires a separate `delta_value` column alongside `override_value` in `worker_records`.
- Requires changes to the `apply_records_override` RPC to handle delta vs. absolute mode.
- Requires changes to the effective metric derivation logic in `lib/records/helpers.ts`.
- Needs careful audit trail: delta source, delta value, and resolved effective value must all be logged.
- The UI must clearly communicate "This is a delta adjustment (+X)" vs. "This is a locked value".
- Impact on `records.stale_override` optimistic locking must be re-evaluated.

**Candidate Future Slice:** R3-RO-Delta / v1.x Records architecture amendment.

**Open Design Questions:**
- Should delta and absolute be mutually exclusive per field, or can both coexist?
- If auto-aggregation is later corrected, should the delta re-apply automatically?
- How should the delta be displayed in the Records table UI?
- Should `before_value` in the audit log reflect the auto-aggregated value or the prior delta?

---

*Last updated: 2026-06-28*

---

## Authenticated Customer Accounts

**Request Summary:**
Allow buyers / end-customers of Kireiku to have authenticated accounts, enabling a personalized buyer dashboard, order history, booking state, and communication history.

**Current Behavior (V1):**
Buyers are public anonymous users on the landing page only (`/`). No authentication flow exists for the buyer tier. This was locked in PRD decision `UD-01`.

**Why Deferred:**
- Requires a dedicated `customer` auth flow separate from the staff (`owner`/`admin`/`member`) flow.
- Needs new RLS policies and a separate actor model for `customer`-scoped data.
- Adds a full product surface (customer dashboard, order/booking management, profile) that is out of scope for v1's operational focus.
- PRD freeze decision `F-1`: "Move authenticated customer accounts to Future Version."

**Candidate Future Slice:** v2 Customer Platform.

---

## Configurable Access Manager UI

**Request Summary:**
A UI page (`/admin/access-manager`) where Owner can dynamically configure which roles can access which routes and operations, instead of relying on a static permission matrix.

**Current Behavior (V1):**
V1 ships with a documented static permission matrix (`auth-and-rls-matrix.md`). The `/admin/access-manager` route is explicitly denied for all roles in the route matrix (PRD decision `UD-04`).

**Why Deferred:**
- Requires a dynamic `access_permissions` table with full CRUD via a UI.
- Role-based dynamic permission resolution is complex to audit and secure.
- Static matrix is safer and faster for v1 launch.
- PRD freeze decision `F-3` and `UD-04`.

**Candidate Future Slice:** v1.x or v2 Access Manager.

---

## Hard Delete Worker UI

**Request Summary:**
A UI action to permanently delete a worker's account and all associated data from the system.

**Current Behavior (V1):**
V1 uses `archive/deactivate-first` via `is_deleted = true` + `show_card = false`. No hard delete UI is shipped. This was locked in PRD decision `UD-03`.

**Why Deferred:**
- Hard deletion of `auth.users` rows requires a privileged server-side flow to avoid orphaned sessions.
- Historical records, attendance, and SP data would be lost — legally and operationally risky without a retention policy.
- PRD freeze decision `F-4` and `UD-03`.

**Candidate Future Slice:** v1.x privileged back-office admin tool with retention policy.

---

## Future-dated Attendance Scheduling & Auto-apply

**Request Summary:**
Allow admin/owner to pre-schedule future Absensi statuses (e.g., schedule a CUTI for next week), which are automatically applied on the target date.

**Current Behavior (V1):**
Absensi supports only present/past correction. Future-dated scheduling is removed from v1 PRD (decision `UD-06`).

**Why Deferred:**
- Requires a scheduler model with `scheduled_at`, `applied_at`, cancellation, and conflict resolution logic.
- Cron jobs must handle auto-apply without double-apply or race conditions.
- `cuti_stock` reservation at schedule-time vs. apply-time is an unresolved design question.
- PRD freeze decision `F-2` and `UD-06`.
- Tracked in `docs/plans/absensi-tracker-sync-deferred-requests.md`.

**Candidate Future Slice:** R3E / v1.x Absensi scheduling design.

---

## Absensi ↔ Tracker Realtime Sync

**Request Summary:**
Bi-directional synchronization between the Absensi (admin correction) surface and the Tracker (live operational) surface, so that a correction in Absensi immediately reflects in Tracker state and vice versa.

**Current Behavior (V1):**
Absensi and Tracker are intentionally separated. Absensi handles historical corrections only; Tracker owns live state. ALPHA corrections must go through the Absensi/Admin correction flow (`UD-07`), not the tracker.

**Why Deferred:**
- Full sync requires idempotency guards, audit trail for conflicts, `worker_status` state machine amendments, and `cuti_stock` reservation.
- Current-day Absensi acting like Tracker START is a product scope expansion, not a bug fix.
- PRD freeze decision `F-5` and `UD-07`.
- Tracked in `docs/plans/absensi-tracker-sync-deferred-requests.md`.

**Candidate Future Slice:** R3E / v1.x realtime sync design.

---

## Worker Salary Auto-calculation Page

**Request Summary:**
A dedicated page that automatically calculates worker salaries based on monthly records (work late, lembur units, sakit days, pending days, etc.) and generates payroll summaries for the admin.

**Current Behavior (V1):**
The Records page (`/admin/records`) is a read-only + override surface. No salary calculation logic exists in v1.

**Why Deferred:**
- Salary calculation rules vary by contract type, role, and shift — requires a configurable formula system.
- Integration with `cuti_stock`, `lembur_units`, and deduction rules needs a separate product design.
- Payroll output format and payslip generation are distinct from the operational records surface.
- No payroll data model exists in v1 schema.

**Candidate Future Slice:** v2 Payroll & Compensation module.

---

## WhatsApp / Telegram API & Payroll HRIS Integration

**Request Summary:**
Integration with external messaging platforms (WhatsApp Business API, Telegram Bot) for automated worker notifications (attendance confirmations, SP alerts, schedule reminders), and integration with an external HRIS or payroll system.

**Current Behavior (V1):**
No external messaging or HRIS integration exists in v1. All communication is in-app only.

**Why Deferred:**
- Requires API key management, webhook security, rate limiting, and delivery guarantees.
- WhatsApp Business API requires a Meta-approved business account and WABA setup.
- HRIS integration requires mapping KireiApp's data model to the external system's schema.
- Introduces external dependencies that increase operational risk for v1 launch.
- Payroll HRIS integration is blocked on the salary calculation feature above.

**Candidate Future Slice:** v2 Notification & Integration module.

---

## Landing Page CMS — Full CRUD via Admin UI

**Request Summary:**
A rich in-app content management interface for the landing page (sections, testimonials, services, FAQ) with drag-and-drop ordering, media uploads, and real-time preview.

**Current Behavior (V1):**
The `/admin/content` page provides basic CRUD for landing content. Advanced ordering, media management, and live preview are not in scope.

**Why Deferred:**
- Drag-and-drop ordering requires position/rank column management and optimistic updates.
- Media uploads via Supabase Storage require upload pipelines, CDN configuration, and size/type policies.
- Real-time preview requires a separate preview rendering mode.

**Candidate Future Slice:** v1.x CMS enhancement.

---

## Cron Observability Dashboard

**Request Summary:**
An admin-facing view showing cron job execution history, success/failure rates, last-run timestamps, and alerting for stuck or failed cron runs.

**Current Behavior (V1):**
Cron runs are logged to server logs only. No observability UI exists (tracked as PRD item `P2-2`).

**Why Deferred:**
- Requires a `cron_run_log` table or integration with an external observability service.
- Dashboard UI design for time-series run history is a separate surface concern.
- Not a freeze blocker for v1 operations.

**Candidate Future Slice:** v1.x operational hardening.

---

## Phase: V1.x (Polishing & UX Excellence)

### Immersive Landing Page
- **Request Summary**: Upgrade the hero section (above the fold) of the public landing page to be highly interactive and immersive.
- **Goal**: Implement visual effects like WebGL shaders (similar to Vercel's design language) to build a premium, wow-factor landing surface.

### Language Consistency Standard
- **Request Summary**: Standardize the copywriting and language boundaries.
- **Standard**:
  - Public Landing Page: Strict English copy for premium branding.
  - Admin Panel: Strict Indonesian copy (buttons, labels, dialog actions) for operational ease, preserving only domain-specific configuration terms (`Tier`, `Shift`, `Role`) in English.

### Accurate Network Sensor
- **Request Summary**: Replace the inaccurate Mbps speed test with a high-fidelity connection validator.
- **Goal**: Implement a real-time Ping/Latency indicator (measured in `ms`) with colored status indicators (e.g., Green if `< 100ms`, Yellow if `100ms - 250ms`, Red if `> 250ms`).

---

## Phase: V2.0 (Major Operational Features)

### Daily Task Management
- **Request Summary**: A centralized daily checklist system for all active workers.
- **Views**:
  - **Member View**: A list of assigned daily checklists where workers can check completed items and input custom proof text or link URLs.
  - **Admin/Owner View (Daily Task Manager)**: A Matrix Data-Grid visualization. Rows display Workers, Columns display Tasks, and Cells show real-time completion status. Includes date-picker filtering to view historical sheets (e.g., 1-3 months back). Allows Admins/Owners to add/edit/delete master task templates.

### Activity Log (Audit Trail)
- **Request Summary**: An owner-only audit trail dashboard.
- **Goal**: Display a chronological log of all database and system actions ("Who" did "What" and "When"), filtering by actor, target user, or log category.

### Office Rules (Peraturan Kantor)
- **Request Summary**: Centralized internal documentation/knowledge base portal.
- **Goal**: Owners can edit content fully via an admin CMS. Admins and Members have read-only access.

### Rate Player (Leaderboard)
- **Request Summary**: A gamified leaderboard ranking workers by performance points.
- **Goal**: Calculate average points derived from external Buyer reviews/ratings using predefined spreadsheet mapping rules.

### Automated Payroll (Perhitungan Gaji)
- **Request Summary**: Automated salary calculation and slip generation.
- **Goal**: A payroll grid mapping workers (rows) to columns pulling directly from `worker_records` metrics (Work Late, Alpha, Lembur units, Sakit/Pending days, etc.) and applying configurable formulas to output take-home pay.

### Auto-carryover Multi-day Absences (Cuti/Sakit/Pending) via Cron
- **Request Summary**: Automate multi-day absences by having the daily cron state machine automatically carry over active absence states (`cuti`, `sakit`, or `pending`) across calendar days, auto-deducting stock (like `cuti_stock` or recording days) until the worker manually checks in or stock runs empty, at which point the worker defaults back to `OFF/ALPHA`.
- **Goal**: Relieve managers from manually clicking `SINKRONKAN` (materialization) or recording daily updates for ongoing multi-day absences.

### Two-way Absensi-Tracker Sync (Two-Way Binding)
- **Request Summary**: Build a reactive two-way synchronization layer between the Absensi dashboard (historical correction/ledger) and the live Tracker screen. Correcting a worker's status inside the Absensi panel instantly resets/updates the worker's live operational status and version, and vice versa.
- **Goal**: Maintain 100% data consistency across both views without requiring manual escape actions or page reloads.

### Temporary Shift Changes with Timers
- **Request Summary**: Allow managers to temporarily alter a worker's shift assignments (e.g. swap from Shift F to Shift A) with an active expiration timer. When the timer expires (e.g. at the end of the shift or operational day), the worker automatically reverts to their default base shift.
- **Goal**: Enable frictionless temporary scheduler adjustments without requiring manual reversion overhead.

### Cancel Start (Check-in Cancellation)
- **Request Summary**: Provide a safety-net mechanism to cancel an active/in-progress shift session (the green START status) within a short grace period (e.g., 5-15 minutes). This allows workers or admins to abort an accidental check-in without corrupting attendance aggregates.
- **Goal**: Reduce data errors from accidental tracker clicks.

---

*Last updated: 2026-07-03*
