# KireiApp V2 Master Scope & Feature Specifications

This document outlines the product specifications, layout hierarchies, logic rules, and prioritized backlog for the upcoming KireiApp V2 release.

---

## 1. High-Priority Operational Upgrades (New V2 Core Features)

### 1. ALPHA Action Lockout
- **Objective**: Prevent inconsistent attendance logs and accidental action overrides when a worker is already marked as ALPHA by the system.
- **Rules**:
  - When a worker's active status is evaluated as `ALPHA`, all standard interactive action buttons on the Tracker screen (e.g. `START`, `CUTI`, `SAKIT`, `PENDING`) must be completely hidden or disabled.
  - The UI will display a static, highlighted badge indicating `ALPHA` for the target day, requiring the Admin to perform manual correction in the Absensi module if needed.

### 2. Daily Task Management (Member Checklist)
- **Objective**: Provide a structured daily checklist for Member (Player) tier workers, integrated with KireiApp's operational shift cycle.
- **Location**: Positioned in the navigation sidebar directly under the **Dashboard** page.
- **Cycle Alignment**: Tracked checklists are scoped specifically to the current Operational Day (matching the shift starting sequence: A-1-B-C-2-D-E-3-F).
- **UI Layout Structure**:
  - **Header**:
    - Title: **Daily Checklist Player**
    - Name: User Display Name (Read-only)
    - Shift Selection Dropdown: Options A / 1 / B / C / 2 / D / E / 3 / F (Allows selection of current shift)
    - Stream Name Input: Text field (Short answer)
    - Game Checkboxes (Multiple select): `Maple Story` / `Black Desert` / `Lainnya`
  - **Checklist Groups**:
    - **A. Before Work**:
      1. `[ ]` Baca Note Buyer dengan Hati-hati
      2. `[ ]` Buka Game yang dimainkan, SS Before
      3. `[ ]` Menyiapkan Streaming & Laporkan Streaming ke CS, Paste streaming di employee report
    - **B. While Work** (Rendered dynamically based on selected game checkboxes):
      - *Maple Story*:
        1. `[ ]` Cek Inventory, Preset Grinding, Legion, Buff
        2. `[ ]` BA setiap 1 jam sekali dan Screenshot setiap BA
        3. `[ ]` Gunakan Buff tepat pada waktunya
        4. `[ ]` Kurangi bermain HP agar bisa lebih fokus
      - *Black Desert*:
        1. `[ ]` Cek Kristal terlebih dahulu
        2. `[ ]` Aktifkan semua buff yang sudah tertera di Note
        3. `[ ]` Tulis Di Note player setiap ada Kristal yang hancur *kasih tanggal* hancurnya
      - *Lainnya*:
        1. `[ ]` Cek item apa saja yang boleh digunakan
        2. `[ ]` Double Check job di note boosting
    - **C. After Work**:
      1. `[ ]` SS after
      2. `[ ]` Update Employee Report
      3. `[ ]` Berikan Update ke CS bahwa akun ini sudah selesai dikerjakan.
  - **Productivity Quote Block**:
    - An English quote card focusing on productivity, hard work, diligence, and success.
    - Dynamically changes on each page navigation/load (e.g. from an array of pre-configured quotes).

### 3. Admin/Owner Dashboard Revamp
- **Objective**: Provide a visual, analytical homepage summarizing operations across all departments for Owners and Admins.
- **Widgets & Layout Hierarchy**:
  1. **Greeting Section**: "Halo, selamat datang [Name]!" with local date/time in WIB.
  2. **Worker Counter Grid**:
      - Total worker count.
      - Status breakdown cards: `ON`, `BREAK`, `LATE`, `SAKIT`, `CUTI`, `PENDING`, `LEMBUR`, `ALPHA`, and `OFF`.
  3. **Active Shift Progress Bars**:
      - High-fidelity visual progress bars showing the 3 shifts active concurrently.
      - Uses gradient styling matching Kireiku’s brand color palette (sleek gradient red).
  4. **Graphic Activity Chart**:
      - A line chart showing active worker status logs per hour.
      - Contains a highlighted green line tracing the total workers marked `ON`.
  5. **Urgent Alerts Pane**:
      - A list displaying workers with `LATE` or `ALPHA` statuses specifically for the current operational day.
  6. **Activity Log**:
      - Chronological feed of recent system modifications: Admin settings changes, credentials updates, or Member daily task completions.
  7. **Monthly Summary**:
      - Grid summarizing key metrics: Work Late (h/m), Break Late (h/m), Sakit (days), Cuti (days), Pending (days), and Lembur (h/m).
  8. **Worker Performance Score Card (Future Addition)**:
      - Ranks departments or individual players by attendance and checklist completion rates.

### 4. Member Dashboard Revamp
- **Objective**: Personal performance tracking and dashboard view replacing the legacy V1 performance page.
- **Widgets & Layout Hierarchy**:
  1. **Greeting Section**: "Halo, selamat datang [Name]!"
  2. **Daily Task Progress Indicator**:
      - A circular percentage progress ring showing completed/total daily tasks for the active shift.
      - If the user has not configured their game options inside the Daily Task page, renders a prompt: "Atur daily task terlebih dahulu".
  3. **Current Status Badge**: Highlighted status banner (`On`, `Late`, `Break`, `Sakit`, `Cuti`, `Pending`, `Alpha`, `Lembur`, or `Off`).
  4. **Monthly Records Summary**: Card grid showing current month totals (Late minutes, sick days, remaining leave days).
  5. **Absensi Calendar Grid**: A monthly calendar showing color-coded daily shift attendance status cells.

### 5. Temporary Shift Changes with Timers & Swapping
- **Objective**: Support short-term schedule changes (e.g. swap from Shift F to Shift A for a day) without manually reverting or causing cron bugs.
- **Database Schema**:
  - Add `temp_shift` (text/nullable) and `temp_shift_until` (timestamptz/nullable) to `worker_profiles`.
- **System Resolution**:
  - The Cron Engine checks if `now() > temp_shift_until`. If yes, it automatically nullifies `temp_shift` and `temp_shift_until`, reverting the worker back to their default base shift parameters silently.
- **Double ALPHA Protection Guard**:
  - Regardless of how many times a worker's shift is swapped in a single day, if a worker already has a `worker_attendance` row for that date, the Cron engine **must completely bypass** all `AUTO_LATE` and `AUTO_ALPHA` evaluation checks for that worker on that date.

### 6. Cancel Start (Check-in Grace Period Cancellation)
- **Objective**: Provide a safety net to abort accidental check-in clicks (the green `START` status) without corrupting attendance metrics.
- **Grace Period**: The "Batal Start" button is visible only during a **15-minute window** starting from `shift_active_started_at` (`now() - shift_active_started_at <= 15 minutes`).
- **Action Workflow**:
  - Clicking "Cancel Start" prompts the worker with an Indonesian confirmation modal.
  - Upon confirmation, the system:
    1. Deletes the `worker_attendance` row associated with that day's shift cycle.
    2. Reverts the worker's status inside `worker_status` back to `OFF`.
    3. Resets all temporary shift session columns (`shift_active_started_at`, `shift_active_label`, etc.) to `null`.
    4. Logs a detailed entry to `audit_logs` (e.g., target table `worker_status`, domain `tracker`, action `tracker.cancel_start`) recording the timestamp and reason to prevent cheating or clock-in manipulation.

---

## 2. Legacy Priority Backlog (In Order of Priority)

### 7. Language Consistency Standard
- **Request Summary**: Standardize the copywriting and language boundaries.
- **Standard**:
  - Public Landing Page: Strict English copy for premium branding.
  - Admin Panel: Strict Indonesian copy (buttons, labels, dialog actions) for operational ease, preserving only domain-specific configuration terms (`Tier`, `Shift`, `Role`) in English.

### 8. Absensi ↔ Tracker Realtime Sync
- **Request Summary**: Build a reactive two-way synchronization layer between the Absensi dashboard (historical correction/ledger) and the live Tracker screen. Correcting a worker's status inside the Absensi panel instantly resets/updates the worker's live operational status and version, and vice versa.
- **Goal**: Maintain 100% data consistency across both views without requiring manual escape actions or page reloads.

### 9. Records Override — Delta/Cumulative Adjustment
- **Request Summary**: Change the Records Manual Override architecture from an **Absolute Lock** model to a **Delta/Cumulative Adjustment** model.
- **Current Behavior (V1 Absolute Lock)**: When an Admin/Owner sets a manual override on a record field (e.g., `alpha_override_count = 3`), the system stores this as an absolute value. It completely replaces any auto-aggregated calculation.
- **Requested Behavior**: An override should be able to represent a *delta* — an additive or subtractive adjustment on top of the system's ongoing auto-aggregated calculation. Example: if the auto-aggregate calculates Alpha = 2, and an Admin applies a delta of +1, the effective value becomes 3. If the system later recalculates Alpha = 4, the effective value would become 5 (4 + 1), without requiring the Admin to re-lock.

### 10. Auto-carryover Multi-day Absences (Cuti/Sakit/Pending) via Cron
- **Request Summary**: Automate multi-day absences by having the daily cron state machine automatically carry over active absence states (`cuti`, `sakit`, or `pending`) across calendar days, auto-deducting stock (like `cuti_stock` or recording days) until the worker manually checks in or stock runs empty, at which point the worker defaults back to `OFF/ALPHA`.
- **Goal**: Relieve managers from manually clicking `SINKRONKAN` (materialization) or recording daily updates for ongoing absences.

### 11. Future-dated Attendance Scheduling & Auto-apply
- **Request Summary**: Allow admin/owner to pre-schedule future Absensi statuses (e.g., schedule a CUTI for next week), which are automatically applied on the target date.
- **Mechanics**:
  - Requires a scheduler model with `scheduled_at`, `applied_at`, cancellation, and conflict resolution logic.
  - Cron jobs must handle auto-apply without double-apply or race conditions.

### 12. Hard Delete Worker UI
- **Request Summary**: A UI action to permanently delete a worker's account and all associated data from the system.
- **Mechanics**:
  - Hard deletion of `auth.users` rows requires a privileged server-side flow to avoid orphaned sessions.
  - Requires database cascading or cleanup strategy for historical records, attendance, and SP logs.

### 13. Worker Salary Auto-calculation & Payroll HRIS Integration
- **Request Summary**: A payroll calculations engine and dashboard to compute salary sums based on monthly performance metrics and HRIS configuration parameters.
- **Goal**: A payroll grid mapping workers (rows) to columns pulling directly from `worker_records` metrics (Work Late, Alpha, Lembur units, Sakit/Pending days, etc.) and applying configurable formulas to output take-home pay, with hooks ready for external HRIS mapping.

### 14. Configurable Access Manager UI
- **Request Summary**: A UI page (`/admin/access-manager`) where Owners can dynamically configure which roles can access which routes and operations, instead of relying on a static permission matrix.

### 15. Authenticated Customer Accounts
- **Request Summary**: Allow buyers / end-customers of Kireiku to have authenticated accounts, enabling a personalized buyer dashboard, order history, booking state, and communication history.

### 16. Landing Page CMS — Full CRUD via Admin UI
- **Request Summary**: A rich in-app content management interface for the landing page (sections, testimonials, services, FAQ) with drag-and-drop ordering, media uploads, and real-time preview.

### 17. WhatsApp / Telegram API Integration
- **Request Summary**: Integration with external messaging platforms (WhatsApp Business API, Telegram Bot) for automated worker notifications (attendance confirmations, SP alerts, schedule reminders).

---

*Last updated: 2026-07-06*
