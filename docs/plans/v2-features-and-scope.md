# KireiApp V2 Scope & Feature Specifications

This document outlines the product specifications, layout hierarchies, and logic rules for the upcoming KireiApp V2 release.

---

## 1. Tracker Improvements

### ALPHA Action Lockout
- **Objective**: Prevent inconsistent attendance logs and accidental action overrides when a worker is already marked as ALPHA by the system.
- **Rules**:
  - When a worker's active status is evaluated as `ALPHA`, all standard interactive action buttons on the Tracker screen (e.g. `START`, `CUTI`, `SAKIT`, `PENDING`) must be completely hidden or disabled.
  - The UI will display a static, highlighted badge indicating `ALPHA` for the target day, requiring the Admin to perform manual correction in the Absensi module if needed.

### Cancel Start (Check-in Grace Period Cancellation)
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

## 2. Advanced Shift Swapping

### Permanent Shift Adjustments
- Updates the worker's base configuration parameters (`shift`, `employee_role`, and custom times if applicable) directly inside the database table `worker_profiles`.

### Temporary Shift Changes with Timers
- **Objective**: Support short-term schedule changes (e.g. swap from Shift F to Shift A for a day) without manually reverting or causing cron bugs.
- **Database Schema**:
  - Add `temp_shift` (text/nullable) and `temp_shift_until` (timestamptz/nullable) to `worker_profiles`.
- **System Resolution**:
  - The Cron Engine checks if `now() > temp_shift_until`. If yes, it automatically nullifies `temp_shift` and `temp_shift_until`, reverting the worker back to their default base shift parameters silently.
- **Double ALPHA Protection Guard**:
  - Regardless of how many times a worker's shift is swapped in a single day, if a worker already has a `worker_attendance` row for that date, the Cron engine **must completely bypass** all `AUTO_LATE` and `AUTO_ALPHA` evaluation checks for that worker on that date.

---

## 3. Daily Task Management (Member)

### Overview
- A dedicated checklist module restricted strictly to the **Member (Player)** tier.
- Positioned in the navigation sidebar directly under the **Dashboard** page.
- Tracked checklists are scoped specifically to the current Operational Day (e.g., matching the shift starting sequence: A-1-B-C-2-D-E-3-F).

### UI Layout Structure
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
  - **B. While Work** (Rendered dynamically based on selected game checkbox):
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

---

## 4. Admin/Owner Dashboard Revamp

### Overview
- A visual, analytical homepage summarizing operations across all departments for Owners and Admins.

### Widgets & Layout Hierarchy
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

---

## 5. Member Dashboard Revamp

### Overview
- Personal performance tracking and dashboard view replacing the legacy V1 performance page.

### Widgets & Layout Hierarchy
1. **Greeting Section**: "Halo, selamat datang [Name]!"
2. **Daily Task Progress Indicator**:
    - A circular percentage progress ring showing completed/total daily tasks for the active shift.
    - If the user has not configured their game options inside the Daily Task page, renders a prompt: "Atur daily task terlebih dahulu".
3. **Current Status Badge**: Highlighted status banner (`On`, `Late`, `Break`, `Sakit`, `Cuti`, `Pending`, `Alpha`, `Lembur`, or `Off`).
4. **Monthly Records Summary**: Card grid showing current month totals (Late minutes, sick days, remaining leave days).
5. **Absensi Calendar Grid**: A monthly calendar showing color-coded daily shift attendance status cells.

---

## 6. Automated Payroll & HRIS

- **Salary Auto-calculation**:
  - Translates `worker_records` metrics (Work Late, Alpha, Lembur units, Sakit/Pending days, etc.) directly into pay summaries using formula configurations.
- **Payslip Generation**:
  - Generates payroll sheets mapping workers to their base rates and delta deductions.

---

*Last updated: 2026-07-06*
