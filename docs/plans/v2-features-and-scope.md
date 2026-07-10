# KireiApp V2 Master Scope & Feature Specifications

This document outlines the product specifications, layout hierarchies, logic rules, and prioritized backlog for the upcoming KireiApp V2 release.

---
### 0. Language Consistency Standard
- **Request Summary**: Standardize the copywriting and language boundaries.
- **Standard**:
  - Public Landing Page: Strict English copy for premium branding.
  - Admin Panel: Strict Indonesian copy (buttons, labels, dialog actions) for operational ease, preserving only domain-specific configuration terms (`Tier`, `Shift`, `Role`) in English.
### 1. 🟡Absensi ↔ Tracker Realtime Sync (seharusnya disinkronisasi dengan ↔ page Records juga dan sebenarnya dengan page page lain juga)
- **Request Summary**: Build a reactive two-way synchronization layer between the Absensi dashboard (historical correction/ledger) and the live Tracker screen. Correcting a worker's status inside the Absensi panel instantly resets/updates the worker's live operational status and version, and vice versa.
- **Goal**: Maintain 100% data consistency across both views without requiring manual escape actions or page reloads.
- **QC 1.1:** Jika seorang _worker_ sedang asyik bekerja (Status ON di _Tracker_), lalu tiba-tiba ada Admin yang mengubah sel absensinya hari itu menjadi SAKIT di halaman Kalender Absensi. Apakah _Tracker_ si pekerja harus langsung dipaksa berubah jadi SAKIT detik itu juga (menghentikan waktu kerjanya)? **Answer 1.1:** iya ubah jadi sakit
- **QC 1.2 (Celah Logika):** Tabel _Absensi_ adalah data **Harian** (tanggal spesifik), sedangkan tabel _Records_ adalah rekap **Bulanan** (jumlah total). Jika Admin membuka halaman _Records_ dan mengubah total "ALPHA" dari 2 menjadi 1, sistem akan bingung: _"Dari 2 hari Alpha di bulan ini, tanggal berapakah yang harus saya hapus di tabel Absensi harian?"_ **Pertanyaan:** Untuk menghindari kebingungan _database_, apakah Anda setuju jika kita menerapkan aturan **Satu Arah (One-Way Truth)**? Yaitu: _"Jika Admin mengedit data di kalender ABSENSI harian, maka total di RECORDS otomatis berubah. TETAPI Admin tidak bisa mengedit angka total secara langsung di halaman RECORDS."_ Answer: apakah ini adalah metode yang terbaik? Kalau iya, maka ya saya setuju
- 🟡REVISI: ekspektasi user yakni tidak janya antara Absensi ↔ Tracker saja tetapi juga dengan Records, dan juga page lain. jadi misalnya user mengubah Records worker di page records agar untuk SAKIT, PENDING, dan ALPHA jadi 0, maka di page absensi di tabelnya juga hilang, begitupun dengan data records yang ada di tracker.
### 2. 🟡Records Override — Delta/Cumulative Adjustment
- **Request Summary**: Change the Records Manual Override architecture from an **Absolute Lock** model to a **Delta/Cumulative Adjustment** model.
- **Current Behavior (V1 Absolute Lock)**: When an Admin/Owner sets a manual override on a record field (e.g., `alpha_override_count = 3`), the system stores this as an absolute value. It completely replaces any auto-aggregated calculation.
- **Requested Behavior**: An override should be able to represent a *delta* — an additive or subtractive adjustment on top of the system's ongoing auto-aggregated calculation. Example: if the auto-aggregate calculates Alpha = 2, and an Admin applies a delta of +1, the effective value becomes 3. If the system later recalculates Alpha = 4, the effective value would become 5 (4 + 1), without requiring the Admin to re-lock.
- **QC 2.1:** Jika sistem menghitung pekerja memiliki 0 menit Work Late, lalu Admin iseng memberikan Delta Minus (-10 menit). Apakah hasilnya dibiarkan -10, atau sistem harus mengunci nilai minimum selalu 0 (tidak boleh ada menit/hari minus)? **Answer 2.1:** sistem harus mengunci nilai minimum selalu 0 , jadi paling minimum adalah 0
- **QC 2.2:** Anda menyebutkan _"BUATKAN AGAR RECORDS HARI INI BISA EDITABLE"_. Di V1, halaman _Records_hanya menampilkan ringkasan 1 bulan penuh. **Pertanyaan:** Apakah maksud Anda Admin bisa mengklik kalender _Absensi_ hari ini, lalu mengubah statusnya secara langsung (misal dari ALPHA menjadi HADIR)? Ataukah Anda butuh tabel khusus yang merinci _Records_ (Telat berapa menit, Lembur berapa jam) secara spesifik **per-hari**? Answer: ohiya maaf saya salah sebut, maksud saya adalah benar seperti katamu, saat ini absensi untuk today/hari ini tidak bisa diedit, nah saya ingin agar selanjutnya status untuk hari ini bisa diedit langsung di page absensi. Behaviornya sama, jika memilih H (Hadir) maka sama dengan klik start di page tracker (di tracker card), kalau pilih S = klik SAKIT di tracker, kalau pilih P = klik PENDING di tracker card, kalau pilih C = CUTI di tracker card, kalau pilih A = langsung dianggap ALPHA hari itu. Tapi kalau ketika pilih A kemudian diedit lagi ke H masih bisa, jadinya dianggap status terakhir
- 🟡REVISI: contohmu sedikit susah dipahami. kalau contoh dari saya yakni, Contoh: jika perhitungan sistem sudah terdapat Alpha = 2, dan seorang Admin mengedit data Alpha di page record menjadi 3 (yang mana itu merupakan 2 +1) maka nilai Alpha menjadi 3 atas penambahan delta +1. Jika worker tersebut Alpha lagi 1x maka sistem kemudian menghitung lanjutan penambahannya jadi 4 (yang mana 3 +1) dan Alpha jadi 4. begitupun juga berlaku untuk pengurangan, kalau misalnya user mengedit data Alpha dari yang awalnya dari sistem ada 2 kemudian diedit menjadi 1, maka nilai Alpha menjadi 1 atas pengurangan delta 1 -1. lalu kalau worker tersebut Alpha lagi 1x maka sistem kemudian menghitung lanjutannya jadi 2 atas dasar 1+1.
### 3. Auto-carryover Multi-day Absences (Cuti/Sakit/Pending) via Cron
- **Request Summary**: Automate multi-day absences by having the daily cron state machine automatically carry over active absence states (`cuti`, `sakit`, or `pending`) across calendar days, auto-deducting stock (like `cuti_stock` or recording days) until the worker manually checks in or stock runs empty, at which point the worker defaults back to `OFF/ALPHA`.
- **Goal**: Relieve managers from manually clicking `SINKRONKAN` (materialization) or recording daily updates for ongoing absences.
- **QC 3.1 (Stok Cuti Habis):** Jika pekerja sedang dalam mode _Auto-carryover_ untuk CUTI berhari-hari, lalu di hari ke-3 ternyata stok cuti_stock-nya habis. Apakah sistem secara otomatis menganggap hari ke-4 sebagai ALPHA(karena tidak ada stok cuti lagi)? **Answer:** Iya, jika cuti stock habis, maka secara default akan otomatis Alpha saja

### 4. Future-dated Attendance Scheduling & Auto-apply
- **Request Summary**: Allow admin/owner to pre-schedule future Absensi statuses (e.g., schedule a CUTI for next week), which are automatically applied on the target date.
- **Mechanics**:
  - Requires a scheduler model with `scheduled_at`, `applied_at`, cancellation, and conflict resolution logic.
  - Cron jobs must handle auto-apply without double-apply or race conditions.
  - **QC 4.1 (Potong Stok):** Jika Admin menjadwalkan CUTI untuk minggu depan, apakah cuti_stock pekerja dipotong **hari ini** (saat jadwal dibuat), atau dipotong **minggu depan** (saat hari H cuti tersebut berjalan)? **Answer: Dipotong hari ini, maka dari itu ketika admin memasang *Future-dated Attendance Scheduling* untuk worker/member kedepannya, jika SAKIT, PENDING, ALPHA, bisa saja, tetapi untuk CUTI jika stocknya sudah habis jadinya tidak bisa memasang CUTI
### 5. 🟡Temporary Shift Changes with Timers & Swapping
- **Objective**: Support short-term schedule changes (e.g. swap from Shift F to Shift A for a day) without manually reverting or causing cron bugs.
- **Database Schema**:
  - Add `temp_shift` (text/nullable) and `temp_shift_until` (timestamptz/nullable) to `worker_profiles`.
- **System Resolution**:
  - The Cron Engine checks if `now() > temp_shift_until`. If yes, it automatically nullifies `temp_shift` and `temp_shift_until`, reverting the worker back to their default base shift parameters silently.
- **Double ALPHA Protection Guard**:
  - Regardless of how many times a worker's shift is swapped in a single day, if a worker already has a `worker_attendance` row for that date, the Cron engine **must completely bypass** all `AUTO_LATE` and `AUTO_ALPHA` evaluation checks for that worker on that date.
  - **QC 5.1 (Konflik Waktu):** Misalnya, batas _shift_ sementara (temp_shift_until) disetel habis pada jam 23:59. Namun, pada jam 23:59 tersebut si pekerja **masih berstatus ON** (sedang sibuk bekerja di _Tracker_). Apakah sistem harus menendangnya kembali ke _shift_ asli saat itu juga, atau menunggu dia menekan SELESAI terlebih dahulu baru _shift_-nya dikembalikan diam-diam? **Answer: opsi 2 lebih masuk akal yakni** menunggu dia menekan SELESAI terlebih dahulu baru _shift_-nya dikembalikan diam-diam. Tujuannya yang penting agar shift yang baru saja dilalui saat itu (yang mana masih di mode ganti shift bukan aslinya) itu tetap tercatat dan bukan terhapus.
  - - **QC 5.2:** Menunggu _worker_ menekan SELESAI baru _shift_-nya dibalikkan adalah UX yang sangat bagus. Namun, bagaimana jika _worker_ tersebut lupa menekan SELESAI hingga keesokan harinya (sehingga terkena _Auto-Off_ oleh Cron)? **Pertanyaan:** Apakah Anda setuju jika _Cron_ AUTO_OFF_SHIFT (yang mematikan status secara paksa di akhir shift) juga secara otomatis membersihkan jadwal _shift_ sementaranya pada saat yang bersamaan? Answer: setuju
  - 🟡**REVISI:** pada fitur ganti shift ini kan sebenarnya ada 2 opsi yang bisa dipilih oleh owner/admin kepada user, yakni apakah shift yang akan diganti tersebut bersifat permanent ataukah temporary. Kalau permanen maka akan mengganti shift seterusnya, kalau temporary maka terdapat input sampai kapan akan dengan shift tersebut, baru setelah itu akan kembali ke shift aslinya

### 6. 🟡Cancel Start (Check-in Grace Period Cancellation)
- **Objective**: Provide a safety net to abort accidental check-in clicks (the green `START` status) without corrupting attendance metrics.
- **Grace Period**: The "Batal Start" button is visible only during a **15-minute window** starting from `shift_active_started_at` (`now() - shift_active_started_at <= 15 minutes`).
- **Action Workflow**:
  - Clicking "Cancel Start" prompts the worker with an Indonesian confirmation modal.
  - Upon confirmation, the system:
    1. Deletes the `worker_attendance` row associated with that day's shift cycle.
    2. Reverts the worker's status inside `worker_status` back to `OFF`.
    3. Resets all temporary shift session columns (`shift_active_started_at`, `shift_active_label`, etc.) to `null`.
    4. Logs a detailed entry to `audit_logs` (e.g., target table `worker_status`, domain `tracker`, action `tracker.cancel_start`) recording the timestamp and reason to prevent cheating or clock-in manipulation.
- 🟡**REVISI**: Reverts the worker's status inside `worker_status` back to `OFF` itu menurut saya kurang tepat karena itu hanya benar ketika masih di luar jam shiftnya, tetapi kalau pembatalan terjadi di dalam jam shiftnya maka ketika dibatalkan akan kembali ke status `LATE`.  Jadi yang paling tepat adalah jika dibatalkan akan kembali ke status tergantung jam shiftnya

### 7. 🟡ALPHA Action Lockout
- **Objective**: Prevent inconsistent attendance logs and accidental action overrides when a worker is already marked as ALPHA by the system.
- **Rules**:
  - When a worker's active status is evaluated as `ALPHA`, all standard interactive action buttons on the Tracker screen (e.g. `START`, `CUTI`, `SAKIT`, `PENDING`) must be completely hidden or disabled.
  - The UI will display a static, highlighted badge indicating `ALPHA` for the target day, requiring the Admin to perform manual correction in the Absensi module if needed.
  - **QC 7.1:** Jika layar _Tracker_ pekerja terkunci karena status ALPHA, apakah kita perlu menampilkan pesan khusus? (Misal: _"Status Anda Alpha hari ini. Hubungi Admin untuk melakukan koreksi."_) Answer: Tidak perlu.
  - 🟡**REVISI**: sebenarnya tujuan awal saya untuk fitur ini yakni agar user member yang baru saja mendapatkan ALPHA tidak selalu berstatus ALPHA hingga shift yang berikutnya datang, sedangkan card worker member yang sedang berstatus ALPHA tidak ada button action sama sekali, yang membuatnya tidak dapat editable status, sehingga terpaksa harus menunggu hingga datangnya shift berikutnya. jadi kalau revisi dari saya yakni ketika worker berstatus ALPHA, maka di cardnya terdapat hany 1 button memaksa _worker_ untuk berinteraksi dengan sistem (misalnya tombolnya kita beri nama **"TERIMA ALPHA"**). Setelah ditekan, status berubah menjadi OFF (menutup _shift_ hari itu), tetapi sistem tetap mengunci data mereka sebagai Alpha di worker_attendance. Ini menciptakan akuntabilitas (_accountability_) yang sangat kuat. Kita akan pakai Opsi 2 di PRD V2.
### 8. 🟡Daily Task Management (Member Checklist)
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
- **QC 8.1 (Input Bukti):** Untuk tugas yang mewajibkan tangkapan layar (_Screenshot Before/After_), apakah _worker_harus **mengunggah file gambar (JPG/PNG)** langsung ke KireiApp, atau cukup **menempelkan tautan/URL** (misal dari Gyazo, Lightshot, Google Drive)? _(Tautan URL jauh lebih murah untuk tagihan server Supabase Anda)._ Answer: Input text saja, tapi jangan dilimit sedikit, buat biar bisa jawaban cukup panjang agar bisa mengirimkan link panjang
- **QC 8.2 (Batas Waktu):** Apakah _Daily Task_ hanya bisa diisi selama _worker_ berstatus ON? Bagaimana jika _shift_ sudah selesai (status OFF), apakah mereka masih diizinkan merapikan centang tugasnya di hari yang sama? Answer: Iya, opsi 2 saja, yakni mereka masih diizinkan merapikan centang tugasnya di hari yang sama meskipun shift sudah selesai (OFF)
- **QC 8.3 (Konfigurasi):** Apakah isi tugas-tugas ini (seperti _Cek Inventory_, _Cek Kristal_) ditanam mati di kode (untuk V2 ini), ataukah Admin/Owner wajib bisa mengedit teks tugas-tugas ini dari Admin Panel? Answer, sekaligus revisi: YA BISA, BUATKAN 1 PAGE LAGI DI TIER OWNER
- **QC 8.4 (Batas Waktu Pengisian):** Anda menyebutkan _worker_ masih bisa merapikan centang tugas meskipun status sudah OFF (selesai _shift_). **Pertanyaan:** Sampai jam berapakah batas toleransi mereka boleh merapikan tugas tersebut? Apakah bebas kapan saja (bahkan besoknya), atau dibatasi maksimal jam 23:59 pada hari kerja tersebut? Answer: waktu pengisiannya dimulai dari mulainya shift hingga 24 jam kedipan, jadi 1 hari sejak shift dimulai
- **QC 8.5 (Approve/Reject Admin):** Di halaman Admin "Daily Task" yang baru, apakah Admin sekadar **melihat (Read-only)** tabel laporan tugas _worker_, ataukah Admin butuh tombol **Approve / Reject** untuk menilai apakah tugas itu sah atau tidak? Answer: iya ada Approve / Reject juga
- 🟡**REVISI:** BUATKAN 1 PAGE LAGI DI TIER OWNER - ADMIN (kalau urutan di sidebar ada di antara Records dan Users Manager (di bawah records, di atas Users Manager) dimana pagenya bernama Daily Task juga tetapi berisi laporan Daily Task semua worker yang ada, berupa tabel dengan styling yang konsisten dan relevant dengan web app ini, dan di sisi kanan atas terdapat tombol “Edit Daily Task” untuk menggantikan/edit teks

### 9. Admin/Owner Dashboard Revamp
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
  - contoh referensi dari ini https://tweakcn.com/themes/cmmab9sq4000004l58w1r3vak
  - **QC 9.1 (Grafik Aktivitas Admin):** Untuk _Line Chart_ yang menampilkan jumlah _worker_ aktif, apakah sumbu X (waktu) menampilkan siklus 24 jam (00:00 - 23:59), atau mengikuti siklus operasional _Shift_ (Misal dimulai dari jam 06:00 Shift A sampai 08:00 Shift F besoknya)?Answer: Opsi 1, Menampilkan waktu 24 jam (00:00 - 23:59)

### 10. Member Dashboard Revamp
- **Objective**: Personal performance tracking and dashboard view replacing the legacy V1 performance page.
- **Widgets & Layout Hierarchy**:
  1. **Greeting Section**: "Halo, selamat datang [Name]!"
  2. **Daily Task Progress Indicator**:
      - A circular percentage progress ring showing completed/total daily tasks for the active shift.
      - If the user has not configured their game options inside the Daily Task page, renders a prompt: "Atur daily task terlebih dahulu".
  3. **Current Status Badge**: Highlighted status banner (`On`, `Late`, `Break`, `Sakit`, `Cuti`, `Pending`, `Alpha`, `Lembur`, or `Off`).
  4. **Monthly Records Summary**: Card grid showing current month totals (Late minutes, sick days, remaining leave days).
  5. **Absensi Calendar Grid**: A monthly calendar showing color-coded daily shift attendance status cells.
  6. contoh referensi dari ini https://tweakcn.com/themes/cmmab9sq4000004l58w1r3vak
- **QC 10.1 (Member Task Progress):** Di Dashboard Member, jika _progress_ harian tidak mencapai 100%, apakah ada penalti otomatis ke sistem (misal SP/Peringatan), atau ini murni hanya sebagai laporan visual untuk dievaluasi manual oleh Admin? Answer: Opsi 2, untuk sistem di dashboard member hanya sebagai laporan visual untuk dievaluasi manual oleh Admin. Biarkan owner-admin yang menentukan apakah mau diberi SP atau tidak

---
### 11. Hard Delete Worker UI
- **Request Summary**: A UI action to permanently delete a worker's account and all associated data from the system.
- **Mechanics**:
  - Hard deletion of `auth.users` rows requires a privileged server-side flow to avoid orphaned sessions.
  - Requires database cascading or cleanup strategy for historical records, attendance, and SP logs.
  - **QC 11.1:** Jika _worker_ benar-benar dihapus secara permanen (Hard Delete), apakah nama mereka di audit_logs masa lalu dan testimonials yang pernah mereka kerjakan akan berubah menjadi "Unknown Worker", atau Anda ingin nama mereka tetap tertulis di sejarah KireiApp meskipun akunnya sudah musnah? Answer: sebenarnya kalau di audit_logs masa lalu dan testimonials dan dimanapun itu, kalau bisa dihapus/dihilangkan juga akan lebih baik, tapi kalau langkah tersebut tidak bisa dilakukan karena misal kurang bijak, jadi opsi 2nama mereka tetap tertulis di sejarah KireiApp meskipun akunnya sudah musnah
  - **QC 11.2 Info Arsitektur:** Karena Anda ingin nama _worker_ tetap ada di _Audit Logs_ dan Sejarah KireiApp meskipun akunnya dihapus, maka secara arsitektur kita **TIDAK AKAN** menghapus datanya dari _database_ secara fisik (Hard Delete). **Rencana PRD:** Kita akan menggunakan mekanisme **Soft Delete**. Di UI Admin, tombolnya bernama "Hapus Pekerja". Namun di belakang layar, sistem hanya mencabut akses _login_-nya dan menyembunyikannya dari _Tracker_, sementara namanya tetap abadi di _Audit Logs_. Apakah Anda setuju dengan pendekatan aman ini? Answer: sebenarnya keinginan user baik itu owner atau admin ketika user ada yang dipecat/hapus, maka akunnya dan SEMUA DATANYA hilang bahkan sampai audit_logsnya juga. Kalau bisa begitu ya itu saja diprioritaskan dulu. Kalau tidak bisa ya pakai metode soft delete

### 12. Worker Salary Auto-calculation & Payroll HRIS Integration
- **Request Summary**: A payroll calculations engine and dashboard to compute salary sums based on monthly performance metrics and HRIS configuration parameters.
- **Goal**: A payroll grid mapping workers (rows) to columns pulling directly from `worker_records` metrics (Work Late, Alpha, Lembur units, Sakit/Pending days, etc.) and applying configurable formulas to output take-home pay, with hooks ready for external HRIS mapping.
- **QC 12.1:** Apakah komponen gaji murni dihitung dari kehadiran/rekam jejak (Gaji Pokok + Lembur - Telat/Alpha)? Ataukah Anda butuh tabel khusus untuk memasukkan **"Kasbon" (Utang Pekerja)** dan **"Bonus Target"** ke dalam KireiApp? Answer: saya sudah ada table spreadsheet beserta kolom dan rumus, apa bisa dibaca oleh antigravity dan diduplikasi ke dalam Kirei beserta logika tabelnya ya?
- **QC 12.2:** Antigravity (dan saya) tidak memiliki mata atau akses untuk membuka file _Spreadsheet_ di komputer lokal Anda. **Pertanyaan:** Agar kami bisa memasukkan rumus penggajian otomatis ini ke dalam PRD V2, **mohon tuliskan daftar kolom (variabel) dan rumus matematika sederhananya di sini.**  _(Contoh format yang saya butuhkan: Gaji Total = Gaji Pokok + (Lembur × Rate) - (Telat Menit × Denda) - Kasbon. Gaji Pokok = Rp X, Denda = Rp Y)_ Answer: ini nanti aja menyusul saya kasih filmnya
### 13. Configurable Access Manager UI
- **Request Summary**: A UI page (`/admin/access-manager`) where Owners can dynamically configure which roles can access which routes and operations, instead of relying on a static permission matrix.
### 14. Landing Page CMS — Full CRUD via Admin UI
- **Request Summary**: A rich in-app content management interface for the landing page (sections, testimonials, services, FAQ) with drag-and-drop ordering, media uploads, and real-time preview.
### 15. Authenticated Customer Accounts
- **Request Summary**: Allow buyers / end-customers of Kireiku to have authenticated accounts, enabling a personalized buyer dashboard, order history, booking state, and communication history.

---

*Last updated: 2026-07-06*
