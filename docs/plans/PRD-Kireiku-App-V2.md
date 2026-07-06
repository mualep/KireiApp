# PRD — Kireiku App V2
**Product Requirements Document v2.0**
*Prepared by: Product Strategy · Last Updated: July 2026*
*Base Reference: PRD V1.0 (April 2026, Frozen). This document extends V1 with all new V2 features, architectural amendments, and operational upgrades.*

## TABLE OF CONTENTS
1. Executive Summary
2. User Stories
3. Functional Requirements — V2 Upgrades
4. Non-Functional Requirements
5. System Architecture — V2 Amendments
6. Data Models — V2 Schema Changes
7. API Specifications — V2 Endpoints
8. State Machine Specification — V2 Amendments
9. UI/UX Specifications — V2 Surfaces
10. Routing & Navigation — V2 Sidebar
11. Content Management — Daily Task CMS
12. Edge Cases & Error Handling — V2 Additions
13. Testing Requirements — V2 Test Cases
14. Implementation Phases — V2 Rollout
15. Tech Stack — V2 Confirmed
16. Out of Scope & Deferred (V3+)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Problem Statement
KireiApp V1 is live and operational, serving 77+ workers across 9 shift cycles with real-time tracking, attendance management, and monthly records. However, V1 has critical operational gaps:

1. **No inter-surface synchronization**: Absensi corrections do not propagate to Tracker state or Records in real-time; each surface operates as a silo requiring manual reconciliation.
2. **No daily task accountability**: Workers (boosters) have no structured pre/during/post-shift checklist tied to their game assignments, forcing supervisors to rely on external chat-based monitoring.
3. **Dashboard surfaces are placeholder-grade**: The Admin dashboard lacks analytical widgets; the Member performance view is a static data dump with no engagement or progress tracking.
4. **ALPHA status creates a dead-end UX**: Workers marked ALPHA have zero actionable buttons, forcing them to wait passively until the next cron cycle resets their state — no accountability moment, no closure.
5. **Records overrides are destructive locks**: Absolute override values prevent the system from continuing auto-aggregation, requiring Admins to manually re-lock values after every subsequent event.
6. **No future-dated scheduling or multi-day absence automation**: Admins must manually set statuses day-by-day for planned leave or extended illness.

### 1.2 Proposed Solution
KireiApp V2 delivers a unified, multi-way synchronized operational platform:

- **Multi-Way Sync Engine**: Absensi ↔ Tracker ↔ Records are bound by a single transactional truth layer. A change on any surface propagates to all others instantly.
- **Delta Override Model**: Records overrides store a mathematical delta rather than an absolute lock, allowing the system to continue auto-aggregation while respecting Admin corrections.
- **Daily Task Management**: Game-specific checklists with Admin CMS, proof-link submissions, and Approve/Reject workflows.
- **ALPHA Accountability Lockout**: A forced `TERIMA ALPHA` interaction that creates an accountability moment and closes the shift cleanly.
- **Analytical Dashboards**: Admin gets operational intelligence (line charts, status counters, shift progress bars, urgent alerts). Member gets a personal progress ring, status badge, calendar grid, and records summary.
- **Temporary Shift Swapping**: Admin-controlled permanent vs. temporary shift changes with silent auto-reversion and double-ALPHA protection.
- **Cancel Start Grace Period**: 15-minute undo window that reverts to the accurate derived status, not blindly to OFF.
- **Auto-Carryover & Future Scheduling**: Cron-driven multi-day absence continuation with stock deduction and future-dated attendance pre-scheduling.

### 1.3 Success Criteria

| KPI | Target |
| --- | --- |
| Cross-surface data consistency (Absensi ↔ Tracker ↔ Records) | 100% — zero orphaned or conflicting rows |
| Daily Task completion rate (Member) | ≥ 80% of active workers submit checklists daily within 30 days of launch |
| Dashboard engagement (Admin login → dashboard interaction) | ≥ 90% of Admin sessions start with dashboard |
| ALPHA accountability closure (TERIMA ALPHA click rate) | 100% — no ALPHA worker remains in limbo past next shift cycle |
| Cancel Start false-positive prevention | Zero corrupted attendance rows from accidental START clicks |
| Delta override accuracy | System auto-aggregation matches expected values within ±0 after override application |

---

## 2. USER STORIES

### 2.1 Owner

```
SEBAGAI Owner,
SAYA INGIN melihat dashboard analitik dengan grafik aktivitas worker per jam, counter status real-time, progress bar shift aktif, dan ringkasan bulanan,
AGAR SAYA bisa memantau kondisi operasional tim secara menyeluruh tanpa membuka setiap halaman.

SEBAGAI Owner,
SAYA INGIN mengubah status absensi hari ini di kalender absensi dan melihat Tracker serta Records langsung ter-update,
AGAR SAYA tidak perlu mengoreksi data di tiga tempat berbeda.

SEBAGAI Owner,
SAYA INGIN mengedit angka Records (misal Alpha dari 2 menjadi 3) dan sistem menghitung delta (+1) secara otomatis di belakang layar,
AGAR nilai tersebut tetap bisa bertambah secara kumulatif dari event sistem selanjutnya tanpa harus saya edit ulang.

SEBAGAI Owner,
SAYA INGIN menjadwalkan CUTI untuk worker di minggu depan dan stok cuti langsung dipotong hari ini,
AGAR tidak terjadi over-booking cuti di kemudian hari.

SEBAGAI Owner,
SAYA INGIN mengonfigurasi item-item checklist Daily Task per game dari Admin Panel,
AGAR saya bisa mengubah tugas harian worker tanpa harus mengedit kode.

SEBAGAI Owner,
SAYA INGIN meng-Approve atau Reject submission Daily Task worker dari halaman Admin Daily Task,
AGAR saya bisa memvalidasi bahwa tugas benar-benar dilaksanakan.

SEBAGAI Owner,
SAYA INGIN mengganti shift worker secara permanen ATAU sementara (dengan timer auto-revert),
AGAR jadwal operasional bisa fleksibel tanpa risiko double ALPHA.

SEBAGAI Owner,
SAYA INGIN menghapus worker (Soft Delete) sehingga login access dicabut dan data operasional tersembunyi, tetapi nama tetap ada di audit logs historis,
AGAR riwayat akuntabilitas tetap terjaga meskipun pekerja sudah keluar.

SEBAGAI Owner,
SAYA INGIN semua teks UI di Admin Panel konsisten dalam Bahasa Indonesia (kecuali istilah teknis Tier/Shift/Role/Delta),
AGAR tim operasional tidak bingung dengan campuran bahasa.

SEBAGAI Owner,
SAYA INGIN melihat Activity Log di dashboard berisi aksi terakhir siapa saja (Admin/Member) yang melakukan perubahan,
AGAR saya bisa mengaudit aktivitas tim secara cepat.
```

### 2.2 Admin

```
SEBAGAI Admin,
SAYA INGIN melihat daftar Urgent Alerts (worker LATE dan ALPHA hari ini) di dashboard,
AGAR saya bisa segera mengambil tindakan operasional.

SEBAGAI Admin,
SAYA INGIN mengedit sel absensi hari ini dan melihat Tracker worker langsung berubah statusnya,
AGAR koreksi data bisa dilakukan dari satu tempat tanpa beralih halaman.

SEBAGAI Admin,
SAYA INGIN menerapkan delta adjustment pada Records (misal mengurangi Alpha dari 2 ke 1, delta -1) dan sistem melanjutkan perhitungan otomatis dari baseline baru tersebut,
AGAR saya tidak perlu terus-menerus mengunci nilai secara manual.

SEBAGAI Admin,
SAYA INGIN mengganti shift worker secara sementara dan sistem otomatis mengembalikan shift asli setelah worker klik SELESAI atau setelah cron AUTO_OFF_SHIFT,
AGAR pergantian harian tidak memerlukan pekerjaan manual untuk mengembalikan shift.

SEBAGAI Admin,
SAYA INGIN melihat tabel submission Daily Task semua worker dengan tombol Approve/Reject,
AGAR saya bisa memvalidasi kelengkapan tugas harian.

SEBAGAI Admin,
SAYA INGIN melihat Monthly Summary (Work Late, Break Late, Sakit, Cuti, Pending, Lembur) di dashboard,
AGAR saya bisa mengevaluasi performa tim secara ringkas.

SEBAGAI Admin,
SAYA INGIN mengaktifkan auto-carryover untuk worker yang sakit berhari-hari sehingga sistem otomatis melanjutkan status SAKIT ke hari berikutnya,
AGAR saya tidak perlu mengklik SINKRONKAN setiap hari.
```

### 2.3 Member

```
SEBAGAI Member,
SAYA INGIN melihat dashboard pribadi dengan progress ring Daily Task, status badge saat ini, ringkasan records bulanan, dan kalender absensi,
AGAR saya bisa memantau performa kerja saya sendiri secara visual.

SEBAGAI Member,
SAYA INGIN mengisi Daily Task checklist sebelum, selama, dan setelah bekerja — dengan checklist yang berubah sesuai game yang saya pilih (Maple Story, Black Desert, dll),
AGAR saya punya panduan kerja yang jelas dan terdokumentasi.

SEBAGAI Member,
SAYA INGIN memasukkan link bukti (URL screenshot) sebagai jawaban panjang di kolom tugas,
AGAR supervisor bisa memverifikasi pekerjaan saya tanpa perlu bertanya via chat.

SEBAGAI Member,
SAYA INGIN bisa merapikan centang Daily Task hingga 24 jam setelah shift dimulai, bahkan setelah status sudah OFF,
AGAR saya punya waktu cukup untuk melengkapi dokumentasi.

SEBAGAI Member,
SAYA INGIN menekan tombol "TERIMA ALPHA" di Tracker ketika status saya ALPHA, sehingga shift saya ditutup dan saya tidak terjebak tanpa tombol apapun,
AGAR ada kejelasan dan akuntabilitas saat saya tidak hadir.

SEBAGAI Member,
SAYA INGIN membatalkan START yang tidak sengaja dalam 15 menit pertama via tombol "Batal Start",
AGAR data kehadiran saya tidak rusak karena salah klik.

SEBAGAI Member,
SAYA INGIN melihat kata-kata motivasi berbahasa Inggris yang berubah setiap kali saya membuka halaman Daily Task,
AGAR saya termotivasi sebelum bekerja.
```

### 2.4 Public / Buyer

```
SEBAGAI Buyer,
SAYA INGIN melihat landing page dalam bahasa Inggris yang konsisten dan profesional,
AGAR saya merasa yakin dengan kualitas layanan Kireiku.
```

*Catatan V2: User stories Buyer tidak berubah dari V1. Landing page tetap public anonymous tanpa authenticated customer flow.*

---

## 3. FUNCTIONAL REQUIREMENTS — V2 UPGRADES

### 3.0 Language Consistency Standard
**FR-LANG-01: Bilingual Boundary**
- **Requirement:** Terapkan batas bahasa yang ketat di seluruh aplikasi.
- **Acceptance Criteria:**
  - Public Landing Page: Seluruh copywriting (headline, deskripsi, CTA, FAQ, testimonials) dalam **Bahasa Inggris**.
  - Admin Panel: Seluruh label UI, tombol, dialog, tooltip, error messages, dan placeholder dalam **Bahasa Indonesia**.
  - Pengecualian istilah teknis yang tetap dalam Bahasa Inggris di Admin Panel: `Tier`, `Shift`, `Role`, `Delta`, `Override`, `Stock`, `SP`, `GID`.
  - Motivational quotes di Daily Task: **Bahasa Inggris**.

---

### 3.1 Multi-Way Sync Engine (Absensi ↔ Tracker ↔ Records)
**FR-SYNC-01: Absensi → Tracker Propagation**
- **Requirement:** Ketika Admin/Owner mengubah sel absensi hari ini, Tracker worker terkait langsung ter-update.
- **Acceptance Criteria:**
  - Edit absensi hari ini ke `H` (Hadir) = sama dengan klik `START` di Tracker (status → ON, attendance → hadir).
  - Edit absensi hari ini ke `S` (Sakit) = sama dengan klik `SAKIT` di Tracker.
  - Edit absensi hari ini ke `P` (Pending) = sama dengan klik `PENDING` di Tracker.
  - Edit absensi hari ini ke `C` (Cuti) = sama dengan klik `CUTI` di Tracker (deduct cuti_stock).
  - Edit absensi hari ini ke `A` (Alpha) = langsung set `alpha_done=true`, attendance → alpha. Worker bisa di-koreksi kembali ke `H` via edit lagi.
  - Status terakhir yang diedit adalah yang berlaku.
  - Semua propagasi terjadi dalam satu transaksi database.

**FR-SYNC-02: Tracker → Absensi Propagation**
- **Requirement:** Aksi Tracker otomatis menghasilkan/mengupdate entry di kalender Absensi.
- **Acceptance Criteria:**
  - Semua transisi Tracker yang menghasilkan attendance entry (START→hadir, CUTI→cuti, SAKIT→sakit, PENDING→pending, AUTO_ALPHA→alpha) langsung tercermin di kalender Absensi tanpa reload.
  - Ini sudah berlaku di V1. V2 memperkuat konsistensi dengan transaksi atomik.

**FR-SYNC-03: Records ↔ Absensi Bidirectional**
- **Requirement:** Perubahan di Records yang melibatkan count fields (alpha, sakit_days, pending_days, cuti_stock) harus merefleksikan perubahan logis di kalender Absensi, dan sebaliknya.
- **Acceptance Criteria:**
  - Ketika Admin mengubah Alpha dari 2 ke 0 di halaman Records, sistem menghitung delta (-2) dan menerapkannya sebagai penyesuaian delta. Sel-sel absensi historis **tidak dihapus otomatis** (karena ambiguitas tanggal). Namun, perhitungan efektif Records merefleksikan nilai baru.
  - Ketika Admin mengedit sel absensi masa lalu (misal mengubah Alpha → Hadir pada tanggal tertentu), aggregate Records untuk bulan tersebut otomatis berkurang 1 Alpha (jika tidak ada override delta aktif di field tersebut).
  - Jika field Records memiliki delta override aktif, perubahan absensi historis tetap mengubah base auto-aggregate, lalu delta diterapkan di atas base baru tersebut.

---

### 3.2 Records Override — Delta/Cumulative Adjustment
**FR-DELTA-01: Delta Override Model**
- **Requirement:** Ganti arsitektur override absolut V1 menjadi model delta kumulatif.
- **Acceptance Criteria:**
  - Admin menginput **angka akhir yang diinginkan** (bukan delta mentah). Contoh: Auto-aggregate Alpha = 2, Admin mengubah ke 3. Sistem menghitung delta = +1 dan menyimpannya.
  - Ketika event sistem selanjutnya terjadi (misal worker Alpha lagi), auto-aggregate menjadi 3, ditambah delta +1 = efektif 4.
  - Ketika Admin mengubah Alpha dari 2 ke 1, delta = -1. Jika worker Alpha lagi, auto-aggregate 2, ditambah delta -1 = efektif 1.
  - Nilai efektif minimum di-hardlock pada `0`. Tidak pernah ada nilai negatif yang ditampilkan atau disimpan.
  - UI Records menampilkan: `nilai efektif` secara prominent, dengan indikator kecil `(delta: ±N)` jika ada delta aktif.

---

### 3.3 Auto-Carryover Multi-day Absences via Cron
**FR-CARRY-01: Automatic Absence Continuation**
- **Requirement:** Cron state machine otomatis melanjutkan status CUTI, SAKIT, atau PENDING ke hari berikutnya.
- **Acceptance Criteria:**
  - Jika worker berstatus `cuti` / `sakit` / `pending` saat POST-SHIFT hari H, cron membuat attendance entry untuk hari H+1 dengan status yang sama.
  - Untuk CUTI: `cuti_stock` di-deduct 1 per hari. Jika `cuti_stock` = 0 pada hari H+1, worker otomatis di-set `ALPHA` untuk hari tersebut.
  - Untuk SAKIT: `sakit_days` di-increment per hari. Aturan SAKIT→PENDING (72 jam) tetap berlaku.
  - Untuk PENDING: `pending_days` di-increment per hari. Tidak ada batas otomatis; worker tetap PENDING hingga Admin mengubah atau worker check-in manual.
  - Worker yang check-in manual (klik START) menghentikan auto-carryover.

---

### 3.4 Future-dated Attendance Scheduling & Auto-apply
**FR-SCHED-01: Future Scheduling Model**
- **Requirement:** Admin/Owner dapat menjadwalkan status absensi di masa depan.
- **Acceptance Criteria:**
  - UI: Calendar picker di halaman Absensi. Admin memilih tanggal masa depan → pilih status (CUTI, SAKIT, PENDING, ALPHA).
  - Untuk **CUTI**: `cuti_stock` **dipotong hari ini** (saat jadwal dibuat). Jika `cuti_stock` = 0, jadwal CUTI ditolak dengan pesan: "Stok cuti habis, tidak bisa menjadwalkan CUTI."
  - Untuk SAKIT, PENDING, ALPHA: tidak ada stok yang dipotong. Jadwal langsung disimpan.
  - Tabel `scheduled_attendance` menyimpan: `user_id`, `target_date`, `status`, `scheduled_at`, `scheduled_by`, `applied_at`, `cancelled_at`.
  - Cron harian memeriksa jadwal yang `target_date = today AND applied_at IS NULL AND cancelled_at IS NULL`, lalu menerapkannya sebagai attendance entry + mengupdate `applied_at`.
  - Admin dapat membatalkan jadwal yang belum diterapkan. Jika jadwal CUTI dibatalkan, `cuti_stock` dikembalikan +1.
  - Double-apply guard: Jika worker sudah memiliki attendance entry untuk target_date, jadwal di-skip dan di-log.

---

### 3.5 Temporary Shift Changes with Timers & Swapping
**FR-SHIFT-01: Permanent vs. Temporary Toggle**
- **Requirement:** Admin UI menyediakan toggle "Permanen" / "Sementara" saat mengganti shift worker.
- **Acceptance Criteria:**
  - **Permanen**: Langsung update `worker_profiles.shift` dan `employee_role` jika perlu. Shift baru berlaku mulai siklus berikutnya.
  - **Sementara**: Menyimpan `temp_shift` dan `temp_shift_until` di `worker_profiles`. Worker menggunakan `temp_shift` sebagai shift aktif sampai salah satu kondisi terpenuhi:
    1. Worker klik `SELESAI` (shift sementara selesai, revert ke shift asli).
    2. Cron `AUTO_OFF_SHIFT` dipicu (shift sementara berakhir karena POST-SHIFT, revert ke shift asli).
  - Revert bersifat silent (tanpa notifikasi UI, cukup DB update).
  - Jika worker masih `ON` saat `temp_shift_until` terlewati, sistem **menunggu** worker klik `SELESAI` atau cron `AUTO_OFF_SHIFT` sebelum melakukan revert.

**FR-SHIFT-02: Double ALPHA Protection Guard**
- **Requirement:** Cegah worker mendapat double penalty saat shift di-swap.
- **Acceptance Criteria:**
  - Jika worker sudah memiliki `worker_attendance` row untuk tanggal target (artinya sudah bekerja/tercatat di shift sebelumnya hari itu), cron engine **harus sepenuhnya bypass** semua evaluasi `AUTO_LATE` dan `AUTO_ALPHA` untuk worker tersebut pada tanggal tersebut.

---

### 3.6 Cancel Start (Check-in Grace Period Cancellation)
**FR-CANCEL-01: 15-Minute Grace Period**
- **Requirement:** Tombol "Batal Start" tersedia di Tracker selama 15 menit pertama setelah START.
- **Acceptance Criteria:**
  - Kondisi tampil: `status = 'on' AND (now() - shift_started_at) <= 15 minutes`.
  - Setelah 15 menit, tombol menghilang secara otomatis.

**FR-CANCEL-02: Revert to Derived Status**
- **Requirement:** Cancel Start mengembalikan worker ke status yang akurat berdasarkan waktu saat ini, bukan blindly ke OFF.
- **Acceptance Criteria:**
  - Jika cancel terjadi **di dalam jam shift** dan grace period keterlambatan sudah terlewati: status revert ke kondisi yang akan menghasilkan derived `LATE`.
  - Jika cancel terjadi **di luar jam shift** atau sebelum grace period: status revert ke `OFF`.
  - Sistem menghapus `worker_attendance` row hari itu, reset `shift_started_at` dan semua `shift_active_*` ke null.
  - `audit_logs` entry dicatat: domain `tracker`, action `tracker.cancel_start`.
  - Modal konfirmasi dalam Bahasa Indonesia: "Apakah Anda yakin ingin membatalkan kehadiran? Data absensi hari ini akan dihapus."

---

### 3.7 ALPHA Accountability Lockout
**FR-ALPHA-01: TERIMA ALPHA Button**
- **Requirement:** Worker berstatus ALPHA melihat satu tombol aksi: `TERIMA ALPHA`.
- **Acceptance Criteria:**
  - Semua tombol standar (START, CUTI, SAKIT, PENDING) **disembunyikan** saat worker berstatus ALPHA.
  - Satu tombol merah prominent `TERIMA ALPHA` ditampilkan.
  - Klik `TERIMA ALPHA`:
    1. Worker status → `OFF` (menutup shift hari itu).
    2. `worker_attendance` row tetap `status = 'alpha'` (tidak berubah).
    3. `alpha_done` flag dipertahankan sesuai aturan expiry yang ada.
  - Koreksi ALPHA → HADIR tetap hanya bisa dilakukan oleh Admin/Owner via flow Absensi correction.
  - Tidak perlu pesan khusus selain tombol itu sendiri.

---

### 3.8 Daily Task Management
**FR-TASK-01: Member Daily Checklist Page**
- **Requirement:** Halaman `/admin/daily-task` khusus tier Member.
- **Acceptance Criteria:**
  - **Header Section:**
    - Judul: **Daily Checklist Player**
    - Nama worker (read-only)
    - Shift Selection: Dropdown A / 1 / B / C / 2 / D / E / 3 / F
    - Stream Name: Text input (short answer)
    - Game Selection: Multiple-select checkboxes (`Maple Story`, `Black Desert`, `Lainnya`)
  - **Checklist Groups (default seed, configurable via Admin CMS):**
    - **A. Before Work:**
      1. `[ ]` Baca Note Buyer dengan Hati-hati
      2. `[ ]` Buka Game yang dimainkan, SS Before
      3. `[ ]` Menyiapkan Streaming & Laporkan Streaming ke CS, Paste streaming di employee report
    - **B. While Work** (rendered dynamically per selected game):
      - *Maple Story:*
        1. `[ ]` Cek Inventory, Preset Grinding, Legion, Buff
        2. `[ ]` BA setiap 1 jam sekali dan Screenshot setiap BA
        3. `[ ]` Gunakan Buff tepat pada waktunya
        4. `[ ]` Kurangi bermain HP agar bisa lebih fokus
      - *Black Desert:*
        1. `[ ]` Cek Kristal terlebih dahulu
        2. `[ ]` Aktifkan semua buff yang sudah tertera di Note
        3. `[ ]` Tulis Di Note player setiap ada Kristal yang hancur *kasih tanggal* hancurnya
      - *Lainnya:*
        1. `[ ]` Cek item apa saja yang boleh digunakan
        2. `[ ]` Double Check job di note boosting
    - **C. After Work:**
      1. `[ ]` SS after
      2. `[ ]` Update Employee Report
      3. `[ ]` Berikan Update ke CS bahwa akun ini sudah selesai dikerjakan.
  - **Proof Input:** Setiap task item memiliki input text panjang (long text, bukan file upload) untuk menempelkan link bukti/URL.
  - **Editing Window:** Worker memiliki tepat **24 jam** dari `shift_start` waktu shift aktif mereka untuk mengisi/mengedit Daily Task. Setelah 24 jam, form menjadi read-only.
  - **Motivational Quote Block:** Blok kutipan Bahasa Inggris bertema produktivitas. Berubah setiap kali halaman di-load (random pick dari array pre-konfigurasi).

**FR-TASK-02: Admin Daily Task Review Page**
- **Requirement:** Halaman `/admin/daily-task` untuk tier Owner dan Admin.
- **Acceptance Criteria:**
  - Posisi sidebar: di bawah Records, di atas Users Manager.
  - Konten: Tabel submission Daily Task semua worker, menampilkan nama, shift, tanggal, game, jumlah task selesai, status (Pending Review / Approved / Rejected).
  - Tombol **Approve** dan **Reject** per submission row.
  - Tombol **"Edit Daily Task"** di kanan atas halaman → membuka konfigurasi CMS untuk mengedit teks checklist items per game.
  - Styling konsisten dengan design system KireiApp.

**FR-TASK-03: Daily Task CMS (Admin Configurable)**
- **Requirement:** Owner/Admin dapat mengedit isi checklist items dari Admin Panel.
- **Acceptance Criteria:**
  - CMS modal/page menampilkan daftar checklist items dikelompokkan per phase (Before Work, While Work per game, After Work).
  - Admin dapat menambah, mengedit teks, menghapus, dan mengubah urutan items.
  - Perubahan berlaku untuk semua submission baru. Submission yang sudah di-submit menggunakan snapshot checklist saat submit.

---

### 3.9 Admin/Owner Dashboard Revamp
**FR-DASH-V2-01: Analytical Dashboard**
- **Requirement:** Dashboard `/admin/dashboard` untuk Owner dan Admin menampilkan widget operasional yang informatif.
- **Acceptance Criteria:**
  - **Layout Hierarchy (top-to-bottom):**
    1. **Greeting Section:** "Halo, selamat datang [Nama]!" dengan tanggal/waktu lokal WIB.
    2. **Worker Counter Grid:**
       - Card total jumlah worker.
       - Status breakdown cards: `ON`, `BREAK`, `LATE`, `SAKIT`, `CUTI`, `PENDING`, `LEMBUR`, `ALPHA`, `OFF`.
       - Setiap card menampilkan count dan warna sesuai status badge design system V1.
    3. **Active Shift Progress Bars:**
       - 3 progress bars menunjukkan shift-shift yang sedang aktif bersamaan.
       - Visual: gradient merah sleek (brand Kireiku).
       - Progress dihitung dari `(now - shift_start) / (shift_end - shift_start) * 100%`.
    4. **Graphic Activity Chart (Line Chart):**
       - Sumbu X: 24 jam (00:00 - 23:59 WIB).
       - Sumbu Y: jumlah worker.
       - Garis hijau: total worker `ON` per jam.
       - Data diambil dari snapshot status hourly yang di-aggregate.
    5. **Urgent Alerts Pane:**
       - Daftar worker berstatus `LATE` atau `ALPHA` khusus hari operasional ini.
       - Ditampilkan dengan badge warna dan nama worker.
    6. **Activity Log:**
       - Feed kronologis dari `audit_logs` terbaru: perubahan Admin, update credentials Member, penyelesaian Daily Task.
       - Maksimal 20 entry terbaru, scrollable.
    7. **Monthly Summary Grid:**
       - Card-card ringkasan metrik bulan ini: Work Late (h/m), Break Late (h/m), Sakit (hari), Cuti (hari), Pending (hari), Lembur (h/m).
       - Nilai diambil dari aggregate `worker_records` bulan berjalan.
    8. **Worker Performance Score Card (Future Addition):**
       - Ranking worker/departemen berdasarkan attendance dan completion rate Daily Task.
       - Ditandai `[Coming Soon]` di V2 initial release.

---

### 3.10 Member Dashboard Revamp
**FR-MDASH-01: Personal Dashboard**
- **Requirement:** Halaman dashboard Member menampilkan ringkasan personal.
- **Acceptance Criteria:**
  - **Layout Hierarchy:**
    1. **Greeting Section:** "Halo, selamat datang [Nama]!"
    2. **Daily Task Progress Indicator:**
       - Circle progress ring: persentase task selesai / total task hari ini.
       - Angka persentase di tengah circle.
       - Keterangan: "X dari Y tugas selesai".
       - Jika Member belum mengatur opsi game di Daily Task page, tampilkan prompt: "Atur daily task terlebih dahulu" dengan link ke halaman Daily Task.
    3. **Current Status Badge:** Banner status terkini yang prominent (`On`, `Late`, `Break`, `Sakit`, `Cuti`, `Pending`, `Alpha`, `Lembur`, `Off`).
    4. **Monthly Records Summary:** Card grid menampilkan total bulan ini: Late (menit), Sakit (hari), Cuti sisa (hari), Pending (hari), Lembur (jam).
    5. **Absensi Calendar Grid:** Kalender bulanan dengan sel tanggal berwarna sesuai status kehadiran harian.
  - Progress ring murni **laporan visual** — tidak ada penalti otomatis jika tidak 100%.

---

### 3.11 Soft Delete Worker ("Hapus Pekerja")
**FR-DEL-01: Soft Delete with Login Revocation**
- **Requirement:** Tombol "Hapus Pekerja" di User Manager melakukan soft delete.
- **Acceptance Criteria:**
  - Set `users.is_deleted = true`, `worker_profiles.show_card = false`.
  - Revoke login access: disable auth credentials di `auth.users` (via service role).
  - Worker **tidak muncul** di Tracker, Absensi, Records, atau Users Manager (filtered by `is_deleted = false`).
  - Nama worker **tetap tersimpan** di `audit_logs` historis dan referensi masa lalu.
  - Konfirmasi modal: "Anda akan menghapus akses [Nama]. Pekerja tidak bisa login lagi. Data historis tetap tersimpan. Lanjutkan?"
  - Aksi hanya tersedia untuk **Owner**.

---

### 3.12 Automated Payroll & Salary Calculation

> [!IMPORTANT]
> **[TBD: Awaiting Spreadsheet Formula Injection from Product Owner]**
> Section ini memerlukan input rumus penggajian dari Product Owner sebelum implementasi. Struktur tabel dan API telah disiapkan sebagai placeholder.

**FR-PAY-01: Payroll Calculator Module**
- **Requirement:** Halaman `/admin/payroll` yang menghitung gaji otomatis dari `worker_records`.
- **Placeholder Schema:**
  - Tabel `payroll_config`: base_salary, overtime_rate, late_deduction_rate, alpha_deduction, sick_deduction, pending_deduction per role/tier.
  - Tabel `payroll_runs`: user_id, month, base_salary, overtime_pay, total_deductions, take_home_pay, generated_at, approved_by.
- **Blocked On:** Product Owner menyerahkan formula spreadsheet.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

*V2 inherits all V1 NFRs (Performance, Security, Data Consistency, Reliability, Accessibility). The following are V2 amendments and additions.*

### 4.1 Performance — V2 Additions

| Requirement | Target |
| --- | --- |
| Multi-way sync propagation latency | ≤ 500ms (Absensi edit → Tracker + Records updated) |
| Dashboard chart render time | ≤ 1 second for line chart with 24h data |
| Daily Task page load | ≤ 800ms |
| Scheduled attendance cron execution | ≤ 5 seconds per run |

### 4.2 Security — V2 Additions

| Requirement | Detail |
| --- | --- |
| Daily Task edit window enforcement | Server-side validation: reject edits > 24h from shift_start |
| Future scheduling stock guard | cuti_stock deducted atomically in transaction with schedule creation |
| Soft delete login revocation | Service role disables auth.users row; session tokens invalidated |
| Delta override floor | Server enforces effective_value >= 0; negative results clamped to 0 |

### 4.3 Data Consistency — V2 Additions

| Domain | Source of Truth | Secondary | Rule |
| --- | --- | --- | --- |
| Daily Task submissions | `daily_tasks` table | Dashboard progress ring | Snapshot at submit time |
| Delta overrides | `worker_records.{field}_delta` | Effective = auto_aggregate + delta | Min 0 floor applied |
| Scheduled attendance | `scheduled_attendance` table | Applied to `worker_attendance` on target date | Single-apply guard |
| Temp shift | `worker_profiles.temp_shift` | Cron evaluates temp_shift first | Revert on SELESAI or AUTO_OFF |

---

## 5. SYSTEM ARCHITECTURE — V2 AMENDMENTS

### 5.1 Architecture Changes
V2 architecture inherits V1 (Next.js App Router + Supabase PostgreSQL + Upstash Redis + Vercel). Key amendments:

1. **Multi-Way Sync Layer**: All mutation endpoints (Tracker action, Absensi cell edit, Records override) call a unified sync function that atomically updates all affected tables in a single Supabase RPC transaction.
2. **Daily Task Storage**: New `daily_tasks` and `daily_task_config` tables in PostgreSQL.
3. **Scheduled Attendance**: New `scheduled_attendance` table. Cron engine extended with `APPLY_SCHEDULED` step.
4. **Dashboard Aggregation**: New hourly snapshot mechanism for activity chart data (can be Redis-cached or materialized view).

### 5.2 Data Flow — Multi-Way Sync (New)
```
Admin edits Absensi cell for TODAY
        │
        ▼
PATCH /api/absensi/cell (V2 enhanced)
        │
        ▼
Route Handler: validate session, tier, permission
        │
        ▼
Supabase RPC: sync_absensi_edit(user_id, date, new_status)
  ├── 1. Upsert worker_attendance row
  ├── 2. IF date = TODAY:
  │       ├── Update worker_status (status, shift_started_at, etc.)
  │       ├── Apply derived state rules
  │       └── Update worker_records aggregate (apply delta if exists)
  ├── 3. IF date = PAST:
  │       └── Update worker_records aggregate only (respect delta)
  ├── 4. Write audit_log entry
  └── 5. Commit transaction
        │
        ▼
DB commit → Supabase Realtime row-change events
        │
        ▼
All connected clients receive updates:
  - Tracker cards re-render
  - Absensi calendar cells re-render
  - Records table re-render (if open)
```

### 5.3 Data Flow — Cron Engine V2 (Extended)
```
Cron V2 adds the following steps BEFORE existing V1 rules:

0. APPLY_SCHEDULED: Check scheduled_attendance where target_date = today
   AND applied_at IS NULL AND cancelled_at IS NULL.
   For each: create worker_attendance entry, update worker_status,
   set applied_at = now().

Existing V1 rules (ALPHA_DONE_RESET, AUTO_LATE, AUTO_ALPHA, etc.)
continue with these additions:

8. AUTO_CARRYOVER: If worker status = cuti/sakit/pending at POST-SHIFT:
   - Create attendance entry for next operational day
   - For CUTI: deduct cuti_stock. If stock = 0 → set ALPHA instead.
   - For SAKIT: increment sakit_days. Check 72h rule.
   - For PENDING: increment pending_days.

9. TEMP_SHIFT_CLEANUP: If worker clicked SELESAI or AUTO_OFF_SHIFT fired
   AND temp_shift IS NOT NULL:
   - Set temp_shift = NULL, temp_shift_until = NULL.
```

---

## 6. DATA MODELS — V2 SCHEMA CHANGES

*V2 retains all V1 tables unchanged. The following are NEW tables and column additions.*

### 6.1 worker_profiles — New Columns
```sql
ALTER TABLE worker_profiles ADD COLUMN
  temp_shift          TEXT,              -- Temporary shift override (nullable)
  temp_shift_until    TIMESTAMPTZ;       -- Expiration for temp shift (nullable)
```

### 6.2 worker_records — Delta Columns
```sql
-- Replace absolute override columns with delta columns
ALTER TABLE worker_records ADD COLUMN
  work_late_delta        INTEGER DEFAULT 0,
  break_late_delta       INTEGER DEFAULT 0,
  alpha_delta            SMALLINT DEFAULT 0,
  cuti_stock_delta       SMALLINT DEFAULT 0,
  sakit_delta            NUMERIC(6,2) DEFAULT 0,
  pending_delta          NUMERIC(6,2) DEFAULT 0,
  lembur_delta           INTEGER DEFAULT 0;

-- Effective value = auto_aggregate + delta, clamped to MIN 0
-- V1 override columns retained for backward compatibility during migration
```

### 6.3 scheduled_attendance (NEW)
```sql
scheduled_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  target_date     DATE NOT NULL,
  status          TEXT NOT NULL
                  CHECK (status IN ('cuti','sakit','pending','alpha')),
  scheduled_by    UUID REFERENCES users(id),
  scheduled_at    TIMESTAMPTZ DEFAULT now(),
  applied_at      TIMESTAMPTZ,            -- NULL = not yet applied
  cancelled_at    TIMESTAMPTZ,            -- NULL = not cancelled
  cancelled_by    UUID REFERENCES users(id),
  notes           TEXT,
  UNIQUE(user_id, target_date)
)
```

### 6.4 daily_task_config (NEW)
```sql
daily_task_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game            TEXT NOT NULL,           -- 'maple_story', 'black_desert', 'other', '_before_work', '_after_work'
  phase           TEXT NOT NULL
                  CHECK (phase IN ('before_work', 'while_work', 'after_work')),
  sort_order      SMALLINT DEFAULT 0,
  label           TEXT NOT NULL,           -- The checklist item text
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 6.5 daily_tasks (NEW)
```sql
daily_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  task_date           DATE NOT NULL,
  shift_label         TEXT NOT NULL,
  stream_name         TEXT,
  selected_games      TEXT[] NOT NULL DEFAULT '{}',  -- Array of game keys
  checklist_snapshot   JSONB NOT NULL,               -- Snapshot of config at submit time
  checklist_answers    JSONB NOT NULL DEFAULT '{}',  -- { config_id: { checked: bool, proof_text: string } }
  status              TEXT NOT NULL DEFAULT 'pending_review'
                      CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  reviewed_by         UUID REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  editable_until      TIMESTAMPTZ NOT NULL,          -- shift_start + 24 hours
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_date)
)
```

### 6.6 activity_snapshots (NEW — Dashboard Chart)
```sql
activity_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_hour   SMALLINT NOT NULL CHECK (snapshot_hour BETWEEN 0 AND 23),
  snapshot_date   DATE NOT NULL,
  status_counts   JSONB NOT NULL,          -- { "on": 15, "break": 3, "late": 5, ... }
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, snapshot_hour)
)
```

### 6.7 Relasi Diagram V2 (Extended)
```
auth.users
  └── users (1:1 app profile)
      ├── worker_profiles (1:1) ─── NEW: temp_shift, temp_shift_until
      ├── worker_status (1:1)
      ├── worker_attendance (1:N)
      ├── worker_records (1:N per month) ─── NEW: delta columns
      ├── worker_sp (1:N)
      ├── daily_tasks (1:N per day) ─── NEW
      ├── scheduled_attendance (1:N) ─── NEW
      └── audit_logs (1:N)

daily_task_config ─── NEW: global checklist template
activity_snapshots ─── NEW: hourly status counts for dashboard chart
```

---

## 7. API SPECIFICATIONS — V2 ENDPOINTS

*V2 retains all V1 API endpoints. The following are new or modified endpoints.*

### 7.1 Absensi — V2 Enhanced
```
PATCH /api/absensi/cell (V2 Enhanced)
```
**Request Body:** Same as V1.
**Response 200 (V2 Enhanced):**
```json
{
  "success": true,
  "updated_attendance": { "...row" },
  "updated_records_delta": { "alpha": -1 },
  "updated_tracker_status": { "...worker_status if current_day" },
  "sync_summary": {
    "tracker_updated": true,
    "records_updated": true,
    "attendance_updated": true
  }
}
```
**V2 Enhancement:** Jika `date = today`, endpoint memanggil unified sync RPC yang mengupdate worker_status, worker_attendance, dan worker_records secara atomik.

### 7.2 Records — V2 Delta Override
```
PATCH /api/records/:userId (V2 Enhanced)
```
**Request Body (V2):**
```json
{
  "month": "2025-04",
  "field": "alpha",
  "desired_value": 3
}
```
**Server Logic:** `delta = desired_value - current_auto_aggregate`. Store delta. Clamp effective to MIN 0.
**Response 200:**
```json
{
  "success": true,
  "field": "alpha",
  "auto_aggregate": 2,
  "delta": 1,
  "effective_value": 3
}
```

### 7.3 Tracker — V2 New Actions
```
POST /api/tracker/action (V2 Enhanced)
```
**New action values:**
- `"TERIMA_ALPHA"`: Accepts Alpha, sets status to OFF while retaining attendance alpha.
- `"CANCEL_START"`: Cancels START within 15-min grace period, reverts to derived status.

### 7.4 Daily Task — Member
```
GET /api/daily-task/my?date=2026-07-07
POST /api/daily-task/submit
PATCH /api/daily-task/:taskId
```

### 7.5 Daily Task — Admin
```
GET /api/daily-task/all?date=2026-07-07&status=pending_review
PATCH /api/daily-task/:taskId/review
```
**Request Body:**
```json
{
  "action": "approve" | "reject",
  "notes": "optional feedback"
}
```

### 7.6 Daily Task Config — CMS
```
GET /api/daily-task-config
POST /api/daily-task-config
PATCH /api/daily-task-config/:configId
DELETE /api/daily-task-config/:configId
```

### 7.7 Scheduled Attendance
```
POST /api/absensi/schedule
```
**Request Body:**
```json
{
  "user_id": "uuid",
  "target_date": "2026-07-14",
  "status": "cuti",
  "notes": "Cuti tahunan"
}
```
**Server Logic:** Jika status = cuti, check cuti_stock > 0. Deduct immediately. Store scheduled_attendance row.

```
DELETE /api/absensi/schedule/:scheduleId
```
**Server Logic:** Set cancelled_at, refund cuti_stock if status was cuti.

### 7.8 Dashboard Aggregation
```
GET /api/dashboard/summary
```
**Response 200:**
```json
{
  "greeting_name": "Budi",
  "status_counts": { "on": 15, "break": 3, "late": 5, "alpha": 2, "off": 52, "cuti": 1, "sakit": 1, "pending": 0, "lembur": 1 },
  "active_shifts": [
    { "label": "A", "start": "06:00", "end": "14:00", "progress_pct": 45 },
    { "label": "1", "start": "07:00", "end": "15:00", "progress_pct": 32 },
    { "label": "B", "start": "08:00", "end": "16:00", "progress_pct": 18 }
  ],
  "hourly_activity": [ { "hour": 0, "on": 5 }, { "hour": 1, "on": 4 }, "..." ],
  "urgent_alerts": [ { "user_id": "uuid", "name": "Andi", "status": "alpha" } ],
  "recent_activity": [ { "actor": "Admin A", "action": "edit absensi", "target": "Budi", "at": "2026-07-07T10:00:00Z" } ],
  "monthly_summary": { "work_late_mins": 450, "break_late_mins": 120, "sakit_days": 5, "cuti_days": 8, "pending_days": 2, "lembur_units": 360 }
}
```

---

## 8. STATE MACHINE SPECIFICATION — V2 AMENDMENTS

### 8.1 Status Definitions — V2 Additions
*All V1 statuses remain. No new stored statuses are added.*

### 8.2 Valid Transitions — V2 Additions

| Tracker Transition | Absensi Sync | Records Sync | Trigger / Notes |
| --- | --- | --- | --- |
| ALPHA → OFF | tetap `A` | `-` | `TERIMA ALPHA` — Worker acknowledges Alpha, closes shift |
| ON → OFF (cancel) | `H → (hapus)` | `WORK_LATE: revert` | `CANCEL START` — within 15 min grace |
| OFF → CUTI (scheduled) | `- → C` (on target_date) | `CUTI: stock deducted at schedule time` | `APPLY_SCHEDULED` cron |

### 8.3 Cron Rules — V2 Additions

| Rule | Condition | Action |
| --- | --- | --- |
| APPLY_SCHEDULED | `target_date = today, applied_at IS NULL, cancelled_at IS NULL` | Create attendance, update status, set applied_at |
| AUTO_CARRYOVER | `POST-SHIFT, status IN (cuti, sakit, pending)` | Create next-day attendance, deduct stock if cuti |
| TEMP_SHIFT_CLEANUP | `SELESAI or AUTO_OFF_SHIFT fired, temp_shift IS NOT NULL` | Nullify temp_shift + temp_shift_until |
| DOUBLE_ALPHA_GUARD | Worker has attendance row for today + shift was swapped | Skip AUTO_LATE + AUTO_ALPHA entirely |

---

## 9. UI/UX SPECIFICATIONS — V2 SURFACES

### 9.1 Design System — V2 Amendments
*V2 retains all V1 design tokens. New additions:*

| Element | Specification |
| --- | --- |
| Progress Ring (Member Dashboard) | Stroke: 8px, Radius: 60px, Color: brand-red gradient |
| Chart Colors (Activity) | ON=#22c55e (green line), LATE=#ea580c (orange), ALPHA=#ef4444 (red) |
| Shift Progress Bar | Gradient: linear-gradient(90deg, #e63535 0%, #ff6b6b 100%) |
| TERIMA ALPHA Button | Background: #ef4444, hover: #dc2626, full-width, height: 48px |
| Cancel Start Button | Outline style, border: 1px solid #ef4444, color: #ef4444 |

### 9.2 Dashboard Design Reference
Design reference: https://tweakcn.com/themes/cmmab9sq4000004l58w1r3vak

---

## 10. ROUTING & NAVIGATION — V2 SIDEBAR

### 10.1 Route Table — V2 Additions

| Path | Auth | Tier |
| --- | --- | --- |
| `/admin/dashboard` | Ya | Owner, Admin (analytical) / Member (personal) |
| `/admin/daily-task` | Ya | Owner, Admin (review table) / Member (checklist) |
| `/admin/payroll` | Ya | Owner, Admin [TBD] |

### 10.2 Sidebar — V2 Layout

**Owner / Admin:**
```
- Dashboard        /admin/dashboard
- Tracker          /admin/tracker
- Absensi          /admin/absensi
- Records          /admin/records
- Daily Task       /admin/daily-task    (NEW — between Records and Users)
- Users            /admin/users
- Content          /admin/content
─────────────────────
- Profile          /admin/profile
- Logout
```

**Member:**
```
- Dashboard        /admin/dashboard     (Personal dashboard, replaces V1 performance)
- Tracker          /admin/tracker       (Self-only)
- Daily Task       /admin/daily-task    (NEW — checklist)
─────────────────────
- Profile          /admin/profile
- Logout
```

---

## 11. CONTENT MANAGEMENT — DAILY TASK CMS

### 11.1 Daily Task Config CMS
| Content | Who Can Edit |
| --- | --- |
| Checklist items (Before Work) | Owner, Admin |
| Checklist items per game (While Work) | Owner, Admin |
| Checklist items (After Work) | Owner, Admin |
| Add new game category | Owner |

### 11.2 CMS Interface
Accessed via "Edit Daily Task" button on Admin Daily Task page:
```
Modal / Page:
├── Tab: Before Work
│   └── Sortable list of checklist items (add/edit/delete/reorder)
├── Tab: While Work — Maple Story
│   └── Sortable list of checklist items
├── Tab: While Work — Black Desert
│   └── Sortable list of checklist items
├── Tab: While Work — Lainnya
│   └── Sortable list of checklist items
└── Tab: After Work
    └── Sortable list of checklist items
```

---

## 12. EDGE CASES & ERROR HANDLING — V2 ADDITIONS

### 12.1 Multi-Way Sync Edge Cases

| Scenario | Handling |
| --- | --- |
| Admin edits absensi TODAY to HADIR while worker is already ON | No-op for Tracker (already ON). Attendance upsert idempotent. |
| Admin edits absensi TODAY to ALPHA while worker is ON | Force worker status to OFF, set alpha_done=true, update attendance. Worker sees TERIMA ALPHA on next render. |
| Admin edits absensi PAST and Records has delta override on that field | Auto-aggregate recalculated, then delta applied on top. Effective = new_auto + existing_delta. |
| Admin sets Records Alpha to 0, but auto-aggregate from attendance is 3 | Delta = 0 - 3 = -3. Effective = 3 + (-3) = 0. If new alpha event occurs: auto = 4, effective = 4 + (-3) = 1. |
| Effective value after delta would be negative | Clamped to 0. Stored delta unchanged, display shows 0. |

### 12.2 Daily Task Edge Cases

| Scenario | Handling |
| --- | --- |
| Worker opens Daily Task but hasn't selected any games | Only Before Work and After Work sections displayed. While Work is empty with prompt: "Pilih game terlebih dahulu." |
| Worker tries to edit Daily Task 25 hours after shift_start | Form is read-only. Toast: "Batas waktu pengisian sudah terlewat." |
| Admin changes Daily Task config while workers have pending drafts | Workers with existing drafts keep their snapshot. New submissions use updated config. |
| Worker submits Daily Task, Admin rejects, worker wants to re-edit | If still within 24h window, worker can re-edit and re-submit. Status returns to pending_review. |

### 12.3 Scheduling Edge Cases

| Scenario | Handling |
| --- | --- |
| Admin schedules CUTI but cuti_stock = 0 | Reject with: "Stok cuti habis. Tidak bisa menjadwalkan CUTI." |
| Admin cancels scheduled CUTI | Refund cuti_stock + 1. Set cancelled_at on schedule row. |
| Cron tries to apply schedule but worker already has attendance for that date | Skip application. Log: "SCHEDULE_SKIP: Attendance already exists." |
| Admin schedules CUTI for 5 consecutive days but stock = 3 | Only 3 schedules created. 4th attempt rejected: "Stok cuti tidak cukup." |

### 12.4 Temporary Shift Edge Cases

| Scenario | Handling |
| --- | --- |
| Worker on temp shift is still ON when temp_shift_until passes | System waits for SELESAI click or AUTO_OFF_SHIFT cron before reverting. Attendance for temp shift is preserved. |
| Worker's shift swapped twice in one day | If attendance row exists for today, bypass ALL AUTO_LATE and AUTO_ALPHA. |
| Admin sets temp shift for a worker who is currently ON | Temp shift takes effect on next shift cycle, not immediately. |

### 12.5 Cancel Start Edge Cases

| Scenario | Handling |
| --- | --- |
| Worker cancels START at 10 minutes into shift (past late threshold) | Status reverts to conditions that produce derived LATE (status=off, alpha_done=false, IN-SHIFT). |
| Worker cancels START at 3 minutes into shift (before late threshold) | Status reverts to OFF normally. |
| Worker tries to cancel START at 16 minutes | Button no longer visible. If API called directly: reject with 422 "Grace period expired." |

---

## 13. TESTING REQUIREMENTS — V2 TEST CASES

### 13.1 Multi-Way Sync Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| SYNC-01 | Admin edits absensi today to SAKIT for worker who is ON | Tracker: status → sakit. Records: sakit_days +1. Attendance: → sakit. |
| SYNC-02 | Admin edits absensi today to HADIR for ALPHA worker | Tracker: alpha_done → false, status → on. Attendance: → hadir. |
| SYNC-03 | Admin edits past absensi alpha → hadir | Records: alpha auto-aggregate decremented. Delta (if any) reapplied. |
| SYNC-04 | Admin edits Records alpha from 2 → 3 (delta +1), worker gets alpha again | Records effective = 4 (auto:3 + delta:+1). |
| SYNC-05 | Admin edits Records alpha from 2 → 0 (delta -2), auto stays 2 | Records effective = 0 (auto:2 + delta:-2, clamped to 0). |

### 13.2 Daily Task Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| TASK-01 | Member selects Maple Story + Black Desert | While Work shows both checklists. |
| TASK-02 | Member submits Daily Task, Admin approves | Status → approved. Dashboard ring shows 100% if all checked. |
| TASK-03 | Member tries to edit after 24h window | Form read-only. API returns 422. |
| TASK-04 | Admin edits Daily Task config | New items appear for future submissions only. |

### 13.3 ALPHA Lockout Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| ALPHA-01 | Worker is ALPHA | Only TERIMA ALPHA button visible. No START/CUTI/SAKIT/PENDING. |
| ALPHA-02 | Worker clicks TERIMA ALPHA | Status → OFF. Attendance remains alpha. |
| ALPHA-03 | Admin corrects ALPHA → HADIR via absensi | Tracker: alpha_done → false. Records: alpha decremented. |

### 13.4 Cancel Start Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| CANCEL-01 | Worker cancels at 5 min (before late threshold, in-shift) | Status → OFF. Attendance deleted. |
| CANCEL-02 | Worker cancels at 12 min (past late threshold, in-shift) | Status → OFF (derived LATE). Attendance deleted. |
| CANCEL-03 | Worker attempts cancel at 16 min | Button hidden. API → 422. |

### 13.5 Scheduling & Carryover Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| SCHED-01 | Schedule CUTI for next week, stock = 5 | Stock → 4. Schedule row created. |
| SCHED-02 | Cancel scheduled CUTI | Stock → 5. Schedule cancelled. |
| SCHED-03 | Cron applies scheduled CUTI on target date | Attendance created, worker status → cuti. |
| CARRY-01 | Worker CUTI at POST-SHIFT, stock = 1 | Next day: attendance = cuti, stock → 0. |
| CARRY-02 | Worker CUTI at POST-SHIFT, stock = 0 | Next day: attendance = alpha. |
| CARRY-03 | Worker SAKIT for 72h | Status → pending. sakit_days incremented daily. |

### 13.6 Dashboard Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| DASH-01 | Admin opens dashboard | All widgets render with live data. |
| DASH-02 | Line chart X-axis | Shows 00:00 to 23:59 (24h). |
| DASH-03 | Member opens dashboard, no daily task configured | Progress ring shows "Atur daily task terlebih dahulu." |
| DASH-04 | Member opens dashboard, 3/5 tasks done | Progress ring shows 60%. |

### 13.7 Shift Swap Tests

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| SWAP-01 | Admin sets temp shift A→F, worker completes F | On SELESAI: temp_shift nullified, reverts to A. |
| SWAP-02 | Worker swapped, already has attendance today | Cron skips AUTO_LATE and AUTO_ALPHA for that worker. |
| SWAP-03 | temp_shift_until passes while worker is ON | No immediate revert. Revert happens on SELESAI or AUTO_OFF. |

---

## 14. IMPLEMENTATION PHASES — V2 ROLLOUT

### Phase V2-1 — Multi-Way Sync + Delta Override (2 weeks)
```
Week 1:
- Unified sync RPC: sync_absensi_edit, sync_tracker_action
- Delta override migration: add delta columns, update Records API
- Absensi edit → Tracker propagation (today)
- Absensi edit → Records propagation

Week 2:
- Records edit → delta calculation + floor clamping
- CANCEL START implementation (15-min grace + derived revert)
- TERIMA ALPHA button + lockout logic
- Integration testing: sync across all 3 surfaces
```

### Phase V2-2 — Daily Task + Dashboard (2-3 weeks)
```
Week 3:
- Daily Task schema: daily_task_config, daily_tasks tables
- Member Daily Task page: checklist UI, game selection, proof inputs
- Daily Task CMS: Admin config editor
- Motivational quote array + random picker

Week 4:
- Admin Daily Task review table: Approve/Reject workflow
- Admin Dashboard: Greeting, Worker Counter, Active Shifts Progress
- Activity snapshots table + hourly cron snapshot writer
- Dashboard: Line Chart (Recharts), Urgent Alerts, Activity Log

Week 5:
- Member Dashboard: Progress ring, Status badge, Monthly summary, Calendar
- Monthly Summary widget (Admin)
- Dashboard responsive layout (mobile/tablet/desktop)
```

### Phase V2-3 — Scheduling + Shift Swap + Carryover (1-2 weeks)
```
Week 6:
- scheduled_attendance table + API
- Future scheduling UI in Absensi calendar
- Cron: APPLY_SCHEDULED step
- Cron: AUTO_CARRYOVER step (cuti stock deduction, SAKIT days, PENDING)

Week 7:
- Temp shift UI: Permanent/Temporary toggle in User Manager
- temp_shift + temp_shift_until columns
- Cron: TEMP_SHIFT_CLEANUP + DOUBLE_ALPHA_GUARD
- Soft Delete worker flow (login revocation + hide)
```

### Phase V2-4 — Language Polish + QA + Launch (1-2 weeks)
```
Week 8-9:
- Language audit: all Admin Panel UI → Indonesian
- Landing page audit: all copy → English
- E2E testing: all V2 test cases
- Payroll placeholder page (TBD awaiting formula)
- Performance audit: sync latency, chart render, Daily Task load
- Bug fixes from QA
- Staged rollout → Full launch
```

---

## 15. TECH STACK — V2 CONFIRMED

*V2 uses the exact same stack as V1. No changes required.*

```
Core Framework:     Next.js App Router + TypeScript
UI Library:         ShadCN UI + Tailwind CSS + CSS Variables
Server State:       @tanstack/react-query v5
UI State:           Zustand
Forms:              React Hook Form + Zod
Validation:         Zod (client + server)
Database:           Supabase PostgreSQL
Realtime:           Supabase Realtime (WebSocket)
Auth:               Supabase Auth (staff email/password only)
Cache:              Upstash Redis (serverless)
Cron:               External cron-job.org (1 min interval)
Deployment:         Vercel
Animations:         Framer Motion
Icons:              Lucide React
Charts:             Recharts (dashboard line chart, progress ring)
Testing:            Vitest + Playwright
CI/CD:              GitHub Actions + Vercel Preview Deployments
```

---

## 16. OUT OF SCOPE & DEFERRED (V3+)

| Feature | Reason Deferred | Target |
| --- | --- | --- |
| Configurable Access Manager UI (`/admin/access-manager`) | Dynamic permission matrix requires complex audit and security review. Static matrix sufficient for current team size. | V3 |
| Authenticated Customer Accounts (Buyer Dashboard) | Requires separate auth flow, RLS policies, and customer-scoped data model. | V3 |
| Landing Page CMS — Advanced (Drag-and-drop, media uploads, live preview) | Requires position/rank management, Supabase Storage upload pipeline, preview rendering mode. | V3 |
| WhatsApp / Telegram API Integration | Requires API key management, webhook security, rate limiting, Meta WABA approval. | V3 |
| Mobile Native App | Web-first strategy sufficient for current operational needs. | V3+ |
| Direct G2G API Integration | G2G does not offer public API for order management. | V3+ |
| Worker Performance Score Card Ranking | Requires defined scoring formula and ranking algorithm. | V2.x |

---

## APPENDIX

### A. Shift Reference Table
*Unchanged from V1. See V1 PRD Appendix A.*

### B. Default Permission Matrix — V2 Additions

| Page / Feature | Owner | Admin | Member |
| --- | --- | --- | --- |
| Dashboard (V2 analytical) | ✓ | ✓ | ✓ personal only |
| Daily Task (view/submit) | ✓ review | ✓ review | ✓ self-only |
| Daily Task (approve/reject) | ✓ | ✓ | ✗ |
| Daily Task Config (CMS) | ✓ | ✓ | ✗ |
| Tracker (TERIMA ALPHA) | ✓ | ✓ | ✓ self-only |
| Tracker (CANCEL START) | ✓ | ✓ | ✓ self-only |
| Payroll | ✓ | ✓ read-only | ✗ |
| Soft Delete Worker | ✓ | ✗ | ✗ |
| Future Scheduling | ✓ | ✓ | ✗ |

### C. Motivational Quotes Pool (Sample)
```
"Success is the sum of small efforts, repeated day in and day out." — Robert Collier
"The secret of getting ahead is getting started." — Mark Twain
"Hard work beats talent when talent doesn't work hard." — Tim Notke
"The only way to do great work is to love what you do." — Steve Jobs
"Don't watch the clock; do what it does. Keep going." — Sam Levenson
"Discipline is the bridge between goals and accomplishment." — Jim Rohn
"Opportunities don't happen. You create them." — Chris Grosser
"It's not about having time. It's about making time." — Unknown
"Push yourself, because no one else is going to do it for you." — Unknown
"Great things never came from comfort zones." — Unknown
```

---

*PRD ini dirancang sebagai referensi tunggal (single source of truth) untuk pengembangan Kireiku App V2. PRD V1 tetap berlaku sebagai baseline arsitektur. Semua fitur V2 di dokumen ini bersifat additive — tidak ada fitur V1 yang dihapus atau diubah secara destruktif.*

*Document Version: 2.0 — July 2026*
