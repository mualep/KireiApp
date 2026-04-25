# PRD — Kireiku App  
**Product Requirements Document v1.0**  
*Prepared by: Product Strategy · Last Updated: April 2026*  
*Freeze Note: PRD v1 frozen after Release 0 amendments. Future changes must be tracked as amendments or v1.x revisions.*  
  
## TABLE OF CONTENTS  
1. Executive Summary  
2. User Stories  
3. Functional Requirements  
4. Non-Functional Requirements  
5. System Architecture  
6. Data Models  
7. API Specifications  
8. State Machine Specification  
9. UI/UX Specifications  
10. Routing & Request Guard Specification  
11. Content Management Specification  
12. Edge Cases & Error Handling  
13. Testing Requirements  
14. Implementation Phases  
15. Tech Stack Recommendations  
  
## 1. EXECUTIVE SUMMARY  
**1.1 Product Overview**  
**Kireiku App** adalah aplikasi web dua sisi yang melayani dua audiens berbeda secara simultan:  
* **Sisi Publik (Landing Page):** Company profile dan showcase layanan Kireiku — perusahaan jasa game boosting yang menjual layanannya di platform G2G ([g2g.com/KireiBoost](https://www.g2g.com/KireiBoost)). Tujuannya adalah meyakinkan calon buyer dan mendorong konversi pembelian.  
* **Sisi Internal (Admin Panel, path /admin):** Sistem manajemen operasional real-time untuk mengelola karyawan (worker/booster), tracking kehadiran, status kerja, records bulanan, dan konfigurasi konten.  
**1.2 Business Goals**  

| Goal | Metric Sukses |
| --------------------------------------------------------------- | --------------------------------------------------- |
| Meningkatkan konversi buyer dari traffic organik / G2G referral | CTR ke G2G ≥ 15% dari total landing page visits |
| Profesionalisasi citra Kireiku di mata buyer | Bounce rate landing page ≤ 40% |
| Efisiensi manajemen operasional internal | Waktu tracking status worker ≤ 1 detik lag |
| Skalabilitas tim karyawan | Support ≥ 100 worker cards tanpa degradasi performa |
| Transparansi dan akuntabilitas karyawan | Zero missed ALPHA/LATE akibat bug sistem |
  
**1.3 Target Users**  

| Tier / Actor | Siapa | Akses |
| -------- | --------------------------- | ------------------------------------------------------------------------- |
| Owner | Pemilik Kireiku | Full system — landing page + seluruh admin panel |
| Admin | Manajer/supervisor internal | Admin panel operasional sesuai static permission matrix v1 |
| Member | Karyawan / booster | Admin panel terbatas, self-only untuk tracker, records, dan profile |
| Public | Buyer / calon buyer layanan Kireiku | Landing page only, tanpa akun authenticated v1 |
  
**1.4 Scope Summary**  
* **In Scope:** Landing page 7 section, admin panel 8 halaman inti, staff auth 3 tier (`Owner`, `Admin`, `Member`), state machine 9 status worker, cron engine, realtime sync, content management dari admin, SP system, static permission matrix v1.  
* **Out of Scope (v1):** authenticated customer account, future-dated attendance scheduling, configurable Access Manager UI, hard delete worker UI, sistem payroll (planned v2), fitur direct messaging untuk notifikasi Alpha worker, mobile native app, integrasi langsung dengan G2G API.
  
## 2. USER STORIES  
**2.1 Owner**  
```
SEBAGAI Owner,
SAYA INGIN melihat ringkasan status semua worker hari ini di dashboard,
AGAR SAYA bisa memantau kondisi operasional tim secara cepat tanpa membuka tracker.

SEBAGAI Owner,
SAYA INGIN melakukan reset status massal semua worker,
AGAR SAYA bisa membersihkan state yang corrupt atau setelah shift selesai secara manual.

SEBAGAI Owner,
SAYA INGIN melihat permission matrix default yang terdokumentasi dengan jelas,
AGAR SAYA bisa memahami batas akses Admin dan Member di v1 tanpa harus mengonfigurasi matrix dari UI.

SEBAGAI Owner,
SAYA INGIN memberikan SP kepada worker dengan alasan dan tanggal expired,
AGAR SAYA bisa memberikan peringatan formal yang terdokumentasi dan terlihat visual.

SEBAGAI Owner,
SAYA INGIN mengedit konten landing page (services, testimonials, stats) dari admin panel,
AGAR SAYA tidak perlu deploy ulang untuk update informasi publik.

SEBAGAI Owner,
SAYA INGIN menonaktifkan / mengarsipkan worker dengan aman,
AGAR akun worker bisa dihentikan tanpa menghapus riwayat operasional secara destruktif pada v1.

SEBAGAI Owner,
SAYA INGIN melihat log aktivitas admin (siapa mengubah apa, kapan),
AGAR SAYA bisa mengaudit perubahan yang dilakukan admin.

```
**2.2 Admin**  
```
SEBAGAI Admin,
SAYA INGIN melihat tracker real-time semua worker,
AGAR SAYA bisa memantau siapa yang sedang OFF, ON, LATE, ALPHA, BREAK, CUTI, SAKIT, PENDING, atau LEMBUR.

SEBAGAI Admin,
SAYA INGIN menekan tombol aksi (START, SELESAI, ISTIRAHAT, dll) untuk worker,
AGAR SAYA bisa mengubah status worker secara manual jika diperlukan.

SEBAGAI Admin,
SAYA INGIN mengedit cell di halaman absensi,
AGAR SAYA bisa memperbaiki catatan kehadiran yang salah atau tidak terekam otomatis.

SEBAGAI Admin,
SAYA INGIN melihat records bulanan semua worker,
AGAR SAYA bisa memantau performa dan memberikan feedback.

SEBAGAI Admin,
SAYA INGIN mencari dan memfilter worker berdasarkan nama, shift, role, atau SP level,
AGAR SAYA bisa menemukan worker tertentu dengan cepat.

SEBAGAI Admin,
SAYA INGIN mengganti shift dari semua worker,
AGAR SAYA bisa mengatur worker yang ingin ganti shift.

```
**2.3 Member**  
```
SEBAGAI Member,
SAYA INGIN login ke admin panel dan melihat status saya sendiri di tracker,
AGAR SAYA tahu kapan saya sedang ON, BREAK, atau dalam kondisi lain.

SEBAGAI Member,
SAYA INGIN melihat statistik bulanan saya di halaman profile,
AGAR SAYA bisa memantau performa kerja saya sendiri (work late, alpha, cuti sisa, dll).

SEBAGAI Member,
SAYA INGIN melihat SP aktif yang saya terima beserta alasannya,
AGAR SAYA memahami peringatan yang diberikan dan bisa memperbaiki performa.

SEBAGAI Member,
SAYA INGIN mengubah display name dan password saya di halaman profile,
AGAR SAYA bisa mengelola informasi akun saya sendiri.

```
Catatan v1: akses `Member` bersifat self-only untuk tracker, records, dan profile; `Member` tidak melihat data worker lain dan tidak memiliki akses ke dashboard, absensi, users, content, atau UI konfigurasi permission.

**2.4 Public / Buyer**  
```
SEBAGAI Buyer / calon buyer,
SAYA INGIN melihat layanan boosting yang tersedia di landing page,
AGAR SAYA tahu game apa saja yang bisa di-boost oleh Kireiku.

SEBAGAI Buyer,
SAYA INGIN melihat testimoni dari buyer sebelumnya,
AGAR SAYA merasa yakin dan percaya dengan kualitas layanan Kireiku.

SEBAGAI Buyer,
SAYA INGIN mengklik tombol "Order Now" yang jelas,
AGAR SAYA langsung diarahkan ke halaman G2G KireiBoost untuk melakukan pembelian.

SEBAGAI Buyer,
SAYA INGIN melihat step-by-step cara order yang jelas,
AGAR SAYA tidak bingung dengan proses pembelian layanan boosting.

SEBAGAI Buyer,
SAYA INGIN menemukan jawaban atas pertanyaan umum di FAQ,
AGAR SAYA tidak perlu menghubungi support untuk pertanyaan dasar.

```
Catatan v1: buyer pada sisi publik tidak memiliki akun authenticated. Semua kebutuhan buyer di v1 dilayani sebagai public anonymous user.
  
## 3. FUNCTIONAL REQUIREMENTS  
**3.1 Authentication & Authorization**  
**FR-AUTH-01: Staff Authentication**  
* **Requirement:** Sistem v1 hanya menyediakan staff authentication untuk `Owner`, `Admin`, dan `Member` melalui email/password.  
* **Acceptance Criteria:**  
    * User staff dapat login dengan email/password valid → session aktif dan redirect ke halaman pertama yang diizinkan.  
    * Tidak ada authenticated `Customer` flow pada v1.  
    * Login gagal → pesan error generik, tanpa reveal tier atau keberadaan akun.  
    * Session expired → redirect ke login page dengan parameter `?redirect=`.  
**FR-AUTH-02: Route Guard, RLS, and Service Boundary**  
* **Requirement:** Semua path `/admin/*`, data access sensitif, dan operasi lifecycle worker harus dilindungi oleh kombinasi request guard layer, server-side permission checks, Supabase RLS, dan service-role-only flows untuk operasi privileged.  
* **Acceptance Criteria:**  
    * Public anonymous user akses `/admin/*` → redirect ke `/admin/login`.  
    * `Member` hanya bisa mengakses resource self-only sesuai static permission matrix v1.  
    * Route guard layer hanya memutuskan redirect kasar; authorization final tetap diverifikasi di server route/data layer.  
    * Semua tabel operasional staff menggunakan RLS.  
    * Operasi privileged seperti create worker, deactivate/archive worker, owner bootstrap, dan reset default permissions tidak bisa dijalankan langsung dari client token biasa.  
**FR-AUTH-03: Session Management**  
* **Requirement:** Session berbasis Supabase Auth JWT dengan expiry yang aman.  
* **Acceptance Criteria:**  
    * Token refresh otomatis sebelum expired.  
    * Logout membersihkan session dan cookie.  
    * Multiple tab/device login diperbolehkan.  
  
**3.2 Landing Page**  
**FR-LAND-01: Hero Section**  
* **Requirement:** Hero section dengan headline, sub-headline, decoration assets (3d icon/image) dan CTA utama.  
* **Acceptance Criteria:**  
    * CTA "Order Now" mengarah ke https://www.g2g.com/KireiBoost (buka tab baru).  
    * Headline dan sub-headline dapat dikonfigurasi dari admin panel (landing_content).  
    * Background visual tampil responsif di mobile, tablet, dan desktop.  
    * Above-the-fold content fully visible tanpa scroll di viewport 1280px.  
**FR-LAND-02: Services Section**  
* **Requirement:** Menampilkan layanan boosting yang aktif dari tabel services.  
* **Acceptance Criteria:**  
    * Hanya service dengan is_active = true yang ditampilkan.  
    * Urutan sesuai sort_order.
    * Card service game boosting menampilkan image game jika tersedia, dengan fallback ke icon/placeholder jika tidak ada.  
    * Section dapat di-update oleh Owner dari admin panel tanpa deploy ulang.  
**FR-LAND-03: Statistics / Why Kireiku Section**  
* **Requirement:** Menampilkan angka statistik dan keunggulan Kireiku.  
* **Acceptance Criteria:**  
    * Angka statistik (total orders, buyers, games, years) diambil dari landing_content dan dapat diedit di admin.  
    * Counter animation saat pertama kali memasuki viewport (Intersection Observer).  
    * 4 unique selling point (USP) cards tampil dengan icon dan deskripsi.  
**FR-LAND-04: Testimonials Section**  
* **Requirement:** Menampilkan testimonial buyer dari tabel testimonials.  
* **Acceptance Criteria:**  
    * Hanya testimonial dengan is_visible = true yang tampil.  
    * Rating bintang 1–5 ditampilkan secara visual.  
    * Slider/carousel responsif dengan autoplay (dapat dihentikan dengan hover).  
**FR-LAND-05: How It Works Section**  
* **Requirement:** Step-by-step panduan cara order.  
* **Acceptance Criteria:**  
    * 4 langkah (Pilih Layanan → Order di G2G → Tim Mulai → Selesai) tampil sebagai numbered steps visual.  
    * Konten tiap step dapat diedit dari admin panel.  
**FR-LAND-06: FAQ Section**  
* **Requirement:** FAQ accordion dengan pertanyaan-jawaban umum.  
* **Acceptance Criteria:**  
    * Pertanyaan dan jawaban dapat ditambah/edit/hapus dari admin panel.  
    * Accordion smooth animation saat expand/collapse.  
    * Default state: semua collapsed.  
**FR-LAND-07: Footer**  
* **Requirement:** Footer dengan link G2G, sosmed, dan copyright.  
* **Acceptance Criteria:**  
    * Logo tampil konsisten dengan branding Kireiku.
    * Link sosmed bisa dikonfigurasi dari admin panel (`landing_content.footer.*`).
    * Copyright tampil konsisten, contoh: `mualep - Kireiku 2026`.  
  
**3.3 Admin Panel — Dashboard (/admin/dashboard)**  
**FR-DASH-01: Status Summary**  
* **Requirement:** Kartu ringkasan status worker hari ini.  
* **Acceptance Criteria:**  
    * Counter real-time: jumlah worker ON, LATE, ALPHA, BREAK, OFF, CUTI, SAKIT.  
    * Live clock WIB (UTC+7) ditampilkan prominent di header admin / sudut kanan atas layout (format example: Fri 24 Apr 20.00).  
    * Dashboard mengambil summary status dari snapshot server yang sudah menghitung `derived_status`; Supabase Realtime hanya dipakai untuk patch row-change persisted state, sedangkan counter `LATE` dan `ALPHA` wajib direconcile ulang dari snapshot server saat refetch/reconnect.  
**FR-DASH-02: Distribution Chart**  
* **Requirement:** Dashboard menampilkan ringkasan operasional yang mudah discan: distribusi status worker saat ini, active shifts overview, recent activity, quick access, dan month summary.  
* **Acceptance Criteria:**  
    * Terdapat chart distribusi status worker yang responsif.
    * Terdapat blok ringkasan seperti active shifts overview, recent activity, quick access, dan month summary.
    * Chart/summary color-coded sesuai status badge colors dari design system.  
    * Tooltip on hover menampilkan jumlah dan persentase.  
  
**3.4 Admin Panel — Tracker (/admin/tracker)**  
**FR-TRACK-01: Worker Card Grid**  
* **Requirement:** Grid kartu per worker dengan informasi dan aksi real-time.  
* **Acceptance Criteria:**  
    * Setiap kartu menampilkan: nama, role, shift, status badge, tombol aksi sesuai tabel status, work_late menit, alpha count, cuti stock, break countdown (jika BREAK).  
    * Kartu hanya ditampilkan untuk worker dengan show_card = true.  
    * Status badge color-coded: ON=hijau, BREAK=kuning, LATE=deep orange, ALPHA=merah, OFF=abu, CUTI=biru, SAKIT=orange, PENDING=ungu, LEMBUR=gold.  
    * Break countdown timer berjalan real-time di sisi klien (tidak bergantung polling server setiap detik).  
**FR-TRACK-02: Action Buttons**  
* **Requirement:** Tombol aksi muncul sesuai status aktif worker dan permission tier user yang login.  
* **Acceptance Criteria:**  
    * Tabel aksi per status:  

| Status  | Tombol                              |
| ------- | ----------------------------------- |
| OFF     | START, CUTI, SAKIT, PENDING, LEMBUR |
| LATE    | START, CUTI, SAKIT, PENDING         |
| ALPHA   | -                                   |
| ON      | SELESAI, ISTIRAHAT                  |
| BREAK   | PAUSE, RESUME, STOP                 |
| CUTI    | BATAL CUTI                          |
| SAKIT   | BATAL SAKIT                         |
| PENDING | BATAL PENDING                       |
| LEMBUR  | BATAL LEMBUR, SELESAI               |

* Member yang login hanya bisa melihat tracker miliknya sendiri, tanpa tombol aksi manual pada v1.  
* Koreksi `ALPHA` tidak dilakukan dari tracker. Koreksi hanya melalui flow Absensi/Admin correction.  
* Semua aksi tombol memanggil API endpoint yang melakukan validasi state sebelum mengubah DB.  
**FR-TRACK-03: Filtering & Search**  
* **Requirement:** Filter dan search pada halaman tracker.  
* **Acceptance Criteria:**  
    * Filter: by shift (dropdown multi-select), by status (dropdown multi-select).  
    * Sort: nama A–Z, status terkritis first (ALPHA > LATE > BREAK > ON > OFF), work_late desc.  
    * Search: real-time filter by nama (debounce 300ms).  
    * Tab: by role (multi-select).
    * Filter state tidak reset saat realtime update datang.  
**FR-TRACK-04: Reset Status (Owner Only)**  
* **Requirement:** Reset semua worker status ke kondisi default.  
* **Acceptance Criteria:**  
    * Tombol "Reset Status" hanya visible untuk Owner.  
    * Muncul modal konfirmasi centered overlay dengan peringatan dan tombol konfirmasi merah.  
    * Setelah dikonfirmasi: semua worker_status di-reset, system_reset_at diupdate di app_settings dan Redis.  
    * Cron engine skip semua AUTO events selama 6 menit setelah reset.  
    * Konfirmasi kedua (input teks "RESET") wajib diisi sebelum tombol submit aktif.  
**FR-TRACK-05: SP Visual Indicator**  
* **Requirement:** Worker card menampilkan SP level secara visual, maksimal 3 SP.  
* **Acceptance Criteria:**  
    * 0 SP aktif: styling normal.  
    * 1 SP aktif: border card dan nama berwarna kuning/warning.  
    * 2 SP aktif: border card dan nama berwarna oranye/danger.  
    * 3 SP aktif: border card dan nama berwarna merah menyala, glow effect subtle.  
    * SP badge kecil di pojok kanan atas kartu menampilkan jumlah SP aktif.  
  
**3.5 Admin Panel — Absensi (/admin/absensi)**  
**FR-ABS-01: Monthly Calendar Grid**  
* **Requirement:** Grid kalender bulanan dengan baris = worker, kolom = tanggal.  
* **Acceptance Criteria:**  
    * Navigasi bulan (prev/next).  
    * Setiap cell menampilkan status kehadiran: HADIR, ALPHA, CUTI, SAKIT, PENDING.  
    * Cell berwarna sesuai status.  
    * Cell yang belum ada datanya tampil kosong/abu.  
**FR-ABS-02: Edit Cell**  
* **Requirement:** Admin dan Owner dapat mengedit cell absensi individual.  
* **Acceptance Criteria:**  
    * Klik cell → dropdown/modal pilih status baru.  
    * Edit cell otomatis sync ke records (misal tambah ALPHA di cell → alpha count di worker_records +1).  
    * Edit cell right now/present sync ke records dan tracker status. 
    * Edit cell masa lampau/past sync ke records, diperbolehkan dengan audit log.  
    * Edit cell masa depan/future tidak termasuk v1.  
    * Member tidak bisa edit cell (sesuai default permission).  
    * Flow Absensi/Admin correction adalah satu-satunya jalur koreksi untuk worker yang sudah tampil `ALPHA`.  
  
**3.6 Admin Panel — Records (/admin/records)**  
**FR-REC-01: Monthly Summary Table**  
* **Requirement:** Tabel rekap bulanan per worker.  
* **Acceptance Criteria:**  
    * Kolom: Nama, Role, Shift, Work Late (m/menit, h/jam), Break Late (m/menit, h/jam), Alpha (x/count), Cuti Stock (x/sisa), Sakit (d/hari), Pending (d/hari), Lembur (display hasil konversi dari `lembur_units` internal).  
    * Data diambil dari worker_records bulan yang dipilih.  
    * Navigasi bulan (prev/next).  
    * Search nama, Filter by role, shift, sort per kolom.  
**FR-REC-02: Edit Record**  
* **Requirement:** Owner dan Admin dapat mengedit record individual per worker.  
* **Acceptance Criteria:**  
    * Klik row → modal edit dengan field yang dapat diubah.  
    * Perubahan disimpan ke DB dengan updated_at baru.  
    * Validasi: work_late tidak boleh melebihi durasi shift dalam menit.  
Catatan v1: penyimpanan dan kontrak API untuk lembur memakai satu unit internal `lembur_units`. Konversi ke jam hanya dilakukan di read/reporting layer.  
**FR-REC-03: Reset Records (Owner Only)**  
* **Requirement:** Reset semua nilai records bulan ini ke zero (kecuali cuti_stock).  
* **Acceptance Criteria:**  
    * Modal konfirmasi dengan input teks "RESET RECORDS".  
    * Hanya nilai numerik yang di-zero; cuti_stock dipertahankan.  
    * Tidak ada recalculation setelah reset (data bersih dari awal).  
    * Log aktivitas tercatat.  
  
**3.7 Admin Panel — User Manager (/admin/users)**  
**FR-USER-01: Worker List**  
* **Requirement:** Tabel semua karyawan (Member tier) dengan data lengkap.  
* **Acceptance Criteria:**  
    * Kolom: Nama, Email, Tier, Role, GID, Shift, Status Aktif (dari worker_status), Cuti Stock, SP Level.  
    * Filter: shift, role, SP level (dropdown).  
    * Search: nama atau email.  
    * Pagination atau infinite scroll (per 25 item).  
**FR-USER-02: Add Worker**  
* **Requirement:** Form tambah worker baru.  
* **Acceptance Criteria:**  
    * Field wajib: nama, email, password awal, employee_role, GID, shift.  
    * Tier worker yang dibuat dari halaman ini default `member` dan tidak perlu dipilih manual.  
    * Field opsional: cuti_stock awal (default 12), show_card (default true), is_flexible (default false).  
    * Validasi email unik sebelum submit.  
    * Setelah berhasil: worker muncul di tracker (jika show_card=true), entri di worker_status dibuat dengan status OFF.  
**FR-USER-03: Edit Worker**  
* **Requirement:** Edit semua field profil worker.  
* **Acceptance Criteria:**  
    * Semua field profil dapat diedit dari modal atau halaman edit.  
    * Ketika shift diganti: worker_profiles diupdate DAN shift_active_* di worker_status direset agar siklus shift baru berlaku.  
    * show_card toggle langsung efek — worker hilang/muncul dari tracker realtime.  
**FR-USER-04: Manage SP**  
* **Requirement:** Beri, lihat, dan cabut SP dari halaman user manager.  
* **Acceptance Criteria:**  
    * Tombol "Beri SP" per worker → modal isi alasan dan tanggal expired.  
    * List SP aktif dan riwayat SP per worker dapat dilihat inline (expandable row) atau di modal.  
    * Tombol "Cabut SP" per SP aktif → konfirmasi → set `revoked_at` dan `revoked_by` pada row `worker_sp` agar riwayat tetap tersimpan.  
    * SP yang expired tidak bisa dicabut (sudah tidak aktif secara otomatis).  
**FR-USER-05: Deactivate / Archive Worker (Owner Only)**  
* **Requirement:** Owner dapat menonaktifkan worker secara aman tanpa hard delete UI pada v1.  
* **Acceptance Criteria:**  
    * Konfirmasi jelas sebelum submit.  
    * Worker yang dinonaktifkan tidak bisa login lagi dan tidak tampil aktif di operasional harian.  
    * Riwayat `worker_attendance`, `worker_records`, `worker_sp`, dan audit tetap dipertahankan.  
    * Perubahan lifecycle worker dilakukan melalui privileged flow, bukan client-side delete langsung.  
  
**3.8 Static Permission Matrix (v1)**  
**FR-ACCESS-01: Static Permission Matrix (Documentation Only)**  
* **Requirement:** v1 menggunakan static permission matrix yang terdokumentasi di PRD dan seed default, tanpa UI konfigurasi permission yang shipped.  
* **Acceptance Criteria:**  
    * Owner selalu full access.  
    * Admin dan Member mengikuti matrix default v1 yang tertulis di PRD.  
    * Tidak ada halaman `/admin/access-manager` yang shipped untuk konfigurasi matrix pada v1.  
  
**3.9 Admin Panel — Profile**  
**FR-PROF-01: Own Profile (/admin/profile)**  
* **Requirement:** Setiap user login dapat melihat dan mengedit profil sendiri.  
* **Acceptance Criteria:**  
    * Informasi tampil: avatar/inisial, nama, email, tier badge, employee_role, GID, shift aktif, cuti stock, SP aktif (badge warning), statistik bulan ini, status real-time.  
    * Field yang bisa diedit sendiri: display name, password.  
    * Riwayat SP tampil dalam tabel (tanggal, alasan, expired, status aktif/expired).  
**FR-PROF-02: Worker Profile (/admin/profile/[userId])**  
* **Requirement:** Owner dan Admin dapat mengakses profil worker lain.  
* **Acceptance Criteria:**  
    * Semua informasi yang sama seperti FR-PROF-01 ditampilkan.  
    * Tambahan: tombol Edit Data, Beri SP, Cabut SP (per SP), mini kalender absensi bulan ini, tabel records ringkas beberapa bulan terakhir, tombol Nonaktifkan / Arsipkan Worker (Owner only).  
    * Member yang mencoba akses /admin/profile/[userId] milik orang lain → redirect ke profil sendiri.  
  
**3.10 Auto Engine / Cron (/api/auto-trigger)**  
**FR-CRON-01: Trigger Sequence**  
* **Requirement:** Endpoint cron berjalan setiap menit, memproses setiap worker secara berurutan.  
* **Acceptance Criteria:**  
    * Urutan proses per worker (jika kondisi terpenuhi, jalankan dan lanjut ke worker berikutnya):  
        1. ALPHA_DONE_RESET: jika `alpha_done=true`, `status=off`, dan sudah masuk siklus shift baru → reset `alpha_done=false`.  
        2. AUTO_LATE: jika `status=off`, `alpha_done=false`, `IN-SHIFT`, dan grace period keterlambatan terlewati → tampilkan `LATE` sebagai derived display state, tanpa write DB.  
        3. AUTO_ALPHA: jika worker akan tetap tampil `LATE` sampai `POST-SHIFT` dan tidak pernah `START` → set `alpha_done=true`, tulis attendance `alpha`, dan update records secara idempotent.  
        4. AUTO_OFF_SHIFT: jika status=on/break, POST-SHIFT → set status=off.  
        5. BREAK_LATE: jika durasi break efektif melewati threshold → catat `break_late` sekali per break episode.  
        6. AUTO_ALPHA_EXPIRE: jika `alpha_done=true` dan expiry terlewati → set `alpha_done=false`, `status=off`.  
        7. SAKIT_TO_PENDING: jika `status=sakit` dan 72 jam terlewati → set `status=pending`.  
    * `AUTO_ALPHA` tidak boleh menulis berdasarkan pseudo-state `status=late`; rule harus mengevaluasi derived lateness dari row mentah.  
    * `LEMBUR` diakumulasi dalam satu unit internal konsisten, lalu dibulatkan hanya pada reporting boundary.  
**FR-CRON-02: Anti-Loop Guard**  
* **Requirement:** Cron tidak boleh memproses AUTO events dalam 6 menit setelah reset massal.  
* **Acceptance Criteria:**  
    * Sebelum memproses, cek system_reset_at dari Redis (TTL 360s) dan fallback ke app_settings DB.  
    * Jika reset dalam 6 menit terakhir → skip semua AUTO events, log "CRON SKIPPED: POST_RESET_LOCKOUT".  
    * Setelah 6 menit → cron berjalan normal kembali.  
**FR-CRON-03: Flexible Worker Handling**  
* **Requirement:** Worker dengan is_flexible = true tidak terikat shift tetap.  
* **Acceptance Criteria:**  
    * Flexible worker tidak mendapat AUTO_LATE dan AUTO_ALPHA dari cron.  
    * Status flexible worker hanya berubah via aksi manual dari tracker.  
    * Di tracker, kartu flexible worker tidak menampilkan shift label.  
  
## 4. NON-FUNCTIONAL REQUIREMENTS  
**4.1 Performance**  

| Requirement                               | Target                     |
| ----------------------------------------- | -------------------------- |
| Realtime update lag (event → UI)          | ≤ 1 detik                  |
| Worker cards realtime tanpa degradasi     | Support ≥ 100 worker cards |
| Landing page Lighthouse Performance score | ≥ 85                       |
| Landing page Lighthouse SEO score         | ≥ 85                       |
| First Contentful Paint (landing page)     | ≤ 1.5 detik                |
| API endpoint response time (P95)          | ≤ 500ms                    |
| Cron endpoint execution time              | ≤ 30 detik per run         |
| Redis coordination key TTL (lockout/mutex) | ≤ 360 detik               |
  
**4.2 Security**  

| Requirement | Detail |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Admin Access Entry | Public anonymous user tidak bisa akses `/admin/*`; validasi server-side wajib |
| Request Guard Layer | Gunakan request guard layer sesuai file convention Next.js yang aktif (`middleware.ts` / `proxy.ts`) hanya untuk coarse redirect, bukan authorization final |
| Path Obscurity | Admin surface tidak dipromosikan dari halaman publik; hanya ada satu link subtle `Staff Login` di footer menuju `/admin/login` |
| RLS | Semua tabel operasional staff wajib `ENABLE RLS`; akses self-only dan admin-wide harus ditegakkan di database, bukan hanya app layer |
| Service Role Boundary | Create worker, deactivate/archive worker, owner bootstrap, dan permission reset default hanya boleh lewat privileged server flow |
| Input Validation | Semua input di-sanitize dan divalidasi server-side sebelum menyentuh DB |
| SQL Injection | Gunakan Supabase RPC dan parameterized queries, tidak ada raw SQL string interpolation |
| XSS | Output di-escape, tidak ada dangerouslySetInnerHTML dengan data dari DB tanpa sanitasi |
| CSRF | Request mutasi via Route Handlers/API wajib memakai origin validation dan kebijakan same-site cookie; tambahkan CSRF token jika memakai form/browser POST berbasis cookie |
| Rate Limiting | Berlaku untuk login dan endpoint mutasi sensitif (`tracker/action`, `tracker/reset`, `users`, `records/reset`, `absensi/cell`, `content` mutasi) |
| Audit Logging | Semua mutasi sensitif wajib menulis ke `audit_logs`; `access_logs` tetap khusus perubahan permission/default matrix |
  
**Auth / RLS Matrix Summary**  
| Surface / Table | Public | Owner | Admin | Member | Notes |
| ------------------------- | ------ | ----- | ----- | ------ | ---------------------------------------------------------------- |
| `/` | Allow | Allow | Allow | Allow | Public landing surface |
| `/admin/dashboard` | Deny | Allow | Allow | Deny | Dashboard bukan self-only surface |
| `/admin/tracker` | Deny | Allow | Allow | Allow self-only | `Member` hanya melihat data sendiri |
| `/admin/records` | Deny | Allow | Allow | Allow self-only | `Member` hanya melihat data sendiri |
| `/admin/absensi` | Deny | Allow | Allow | Deny | Correction flow tetap Owner/Admin |
| `users` | None | All | Limited all | Self-limited | Ditegakkan oleh server check + RLS |
| `worker_status` | None | All | All | Self-read | `Member` tanpa manual tracker action |
| `worker_attendance` | None | All | All | Self-read jika diekspos | Source of truth harian |
| `worker_records` | None | All | All | Self-read | Override-aware reporting |
  
**4.3 Data Consistency**  

| Requirement | Detail |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Worker status consistency | Semua worker dengan shift dan kondisi identik harus menampilkan state yang sama |
| Post-reset consistency | Setelah Reset Status: tidak ada work_late anomali, tidak ada immediate LATE sebelum lockout habis |
| Records cap | work_late tidak boleh melebihi durasi shift dalam menit (hardcoded validation) |
| Action buttons | Tombol aksi selalu muncul sesuai tabel, tidak hilang acak akibat race condition |
| DB Transactions | Operasi yang mengubah beberapa tabel (misal: edit absensi → update records) harus dalam satu transaction atau menggunakan Supabase RPC |

| Domain | Source of truth | Secondary / snapshot | Aturan |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| Current operational state | `worker_status` | none | Menyimpan stored state saja |
| Derived lateness / alpha display | computed dari `worker_status` + shift context | API `derived_status` | Tidak pernah disimpan sebagai `late` |
| Daily attendance | `worker_attendance` | tracker side effects | Satu row per worker per tanggal shift, hasil final kehadiran harian |
| Monthly summary | `worker_records` | none | Agregat bulanan + snapshot reporting |
| Current leave balance | `worker_profiles.cuti_stock` | `worker_records.cuti_stock` | Canonical current balance |
| Historical leave balance | `worker_records.cuti_stock` | none | Snapshot histori bulan, bukan source balance berjalan |
| Manual overrides | field override di `worker_records` | none | Override menang atas auto aggregate sampai diubah manual |
  
**4.4 Reliability**  

| Requirement | Detail |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Uptime target | ≥ 99.5% (Vercel SLA) |
| Realtime reconnect | Supabase Realtime subscription auto-reconnect jika koneksi putus |
| Cron failure recovery | Jika satu run gagal, run berikutnya berjalan normal tanpa memerlukan manual intervention |
| Redis fallback | Jika Redis tidak tersedia, fallback ke DB query langsung (performance degraded but functional) |
  
**4.5 Accessibility**  
* Landing page: WCAG 2.1 AA compliance untuk kontras warna dan keyboard navigation.  
* Admin panel: Semua form field memiliki label yang benar, focus state visible.  
  
## 5. SYSTEM ARCHITECTURE  
**5.1 High-Level Architecture**  
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL EDGE / CDN                              │
├───────────────────────────────┬──────────────────────────────────────────────┤
│         PUBLIC SURFACE         │               ADMIN SURFACE                 │
│   /                            │   /admin/*                                  │
│   Next.js App Router + ISR     │   Next.js App Router                        │
│   Source: landing_content,     │   Request guard layer + permission          │
│   services, testimonials       │   redirect                                  │
│   No auth required             │   Server-rendered shell + client islands    │
└───────────────────────────────┴──────────────────────────────────────────────┘
                 │                                   │
                 ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP ROUTER LAYER                            │
│  ┌────────────────────┐  ┌────────────────────────┐  ┌───────────────────┐  │
│  │ Server Components  │  │ Route Handlers /api/* │  │ Request Guard Layer│  │
│  │ + ISR / RSC        │  │ Tracker, records,     │  │ Auth + redirect +  │  │
│  │                    │  │ users, cron, CMS      │  │ path guard         │  │
│  └────────────────────┘  └────────────────────────┘  └───────────────────┘  │
│                                                                              │
│  Server Actions bersifat opsional untuk form internal kecil,                │
│  tetapi bukan fondasi utama arsitektur.                                     │
└──────────────────────────────────────────────────────────────────────────────┘
                 │                                   │
         ┌───────┘                                   └────────┐
         ▼                                                            ▼
┌────────────────────────┐                                ┌────────────────────────┐
│     UPSTASH REDIS      │                                │       SUPABASE         │
│ Coordination / cache   │                                │  ┌──────────────────┐  │
│ ringan saja            │                                │  │  PostgreSQL DB   │  │
│ - system_reset_at      │                                │  │  source of truth │  │
│ - cron mutex / lock    │                                │  │  seluruh data    │  │
│ - permission/system    │                                │  └──────────────────┘  │
│   flag cache ringan    │                                │  ┌──────────────────┐  │
└────────────────────────┘                                │  │ Supabase Auth    │  │
                                                          │  │ JWT / session    │  │
                                                          │  └──────────────────┘  │
                                                          │  ┌──────────────────┐  │
                                                          │  │ Supabase         │  │
                                                          │  │ Realtime         │  │
                                                          │  │ row-change stream│  │
                                                          │  └──────────────────┘  │
                                                          └────────────────────────┘
                                                                       │
                                                                       ▼
                                                          ┌────────────────────────┐
                                                          │      VERCEL CRON       │
                                                          │ GET /api/auto-trigger  │
                                                          │ Every 1 minute         │
                                                          │ Auth via CRON_SECRET   │
                                                          └────────────────────────┘

```
Authorization v1 memakai empat lapis: request guard layer untuk coarse redirect, server-side permission validation pada route/data layer, Supabase RLS pada tabel operasional, dan privileged service-role flow untuk operasi lifecycle / bootstrap yang tidak boleh dieksekusi oleh token user biasa.
**5.2 Data Flow — Tracker Action**  
```
User klik tombol "START" di tracker
        │
        ▼
Client → POST /api/tracker/action
        │
        ▼
Route Handler: validate session staff
        │
        ▼
Validate actor scope:
- Owner/Admin: sesuai static permission matrix
- Member: self-only read, tanpa action manual v1
        │
        ▼
Open transaction / RPC kecil
        │
        ▼
Load current `worker_status` + row version
        │
        ▼
Validate transition, phase, permission, dan ownership target
        │
        ├─── PERMISSION INVALID → Return 403
        │
        ├─── TRANSITION INVALID → Return 422
        │
        ├─── VERSION CONFLICT / stale state → Return 409
        │
        └─── VALID →
                │
                ▼
        Apply writes:
        - `worker_status` sebagai current state
        - `worker_attendance` sebagai daily truth bila perlu
        - `worker_records` sebagai aggregate / snapshot bila perlu
        - `audit_logs` untuk mutasi sensitif
                │
                ▼
        Commit transaction
                │
                ▼
        Invalidate cache ringan yang relevan (jika ada)
                │
                ▼
        DB commit triggers Supabase Realtime row-change event
                │
                ▼
        Connected clients menerima payload perubahan row
                │
                ▼
        Client patch hanya worker yang berubah di query cache
                │
                ▼
        Worker card re-render dengan status baru

```
Untuk display `LATE` dan `ALPHA`, endpoint `GET /api/tracker` wajib mengembalikan row mentah plus `derived_status` hasil komputasi server agar reconnect dan cache patch tetap konsisten.
**5.3 Data Flow — Cron Engine**  
```
Vercel Cron → GET /api/auto-trigger (every 1 min)
        │
        ▼
Validate CRON_SECRET
        │
        ▼
Acquire Redis mutex / lock
        │
        ├─── LOCK FAILED → Cron overlap, log SKIP, return 200
        │
        └─── LOCK ACQUIRED →
                │
                ▼
        Check system_reset_at
        - Prioritas Redis
        - Fallback ke app_settings
                │
                ├─── Dalam lockout < 6 menit →
                │       Log SKIP
                │       Release lock
                │       Return 200
                │
                └─── Tidak lockout →
                        │
                        ▼
                Load active workers langsung dari PostgreSQL
                Join data minimal: worker_profiles + worker_status
                        │
                        ▼
                Evaluate rules per worker secara deterministik:
                
                Derived-only rule:
                1. AUTO_LATE
                   - Bukan DB update
                   - Hanya derived/display state dari:
                     status='off' AND alpha_done=false AND IN-SHIFT
                     AND melewati grace period keterlambatan
                
                Mutation-producing rules:
                2. ALPHA_DONE_RESET
                3. AUTO_ALPHA
                4. AUTO_OFF_SHIFT
                5. BREAK_LATE
                6. AUTO_ALPHA_EXPIRE
                7. SAKIT_TO_PENDING
                        │
                        ▼
                Untuk worker is_flexible = true:
                - skip rule shift-based seperti AUTO_LATE dan AUTO_ALPHA
                        │
                        ▼
                Untuk rule yang mutate:
                - lakukan DB write secara transactional per worker / per change-set kecil
                - update worker_attendance jika perlu
                - update worker_records jika perlu
                - update cron_last_run / log hasil proses
                        │
                        ▼
                DB commit triggers Supabase Realtime row-change event
                        │
                        ▼
                Release Redis lock di akhir
                (termasuk pada branch error / finally)

```
Derived realtime strategy v1:
* `LATE` tidak mengandalkan row-change event karena bukan stored DB state.
* Server mengembalikan `derived_status` pada snapshot tracker/dashboard.
* Client boleh menghitung countdown / derived timer ringan secara lokal, tetapi wajib reconcile ulang dari snapshot server saat reconnect, refetch, atau setelah aksi manual.
* `AUTO_ALPHA` dan `ALPHA_DONE_RESET` menghasilkan row-change nyata sehingga realtime stream tetap menjadi sumber event untuk perubahan persisted state.
* `BREAK_LATE` wajib idempotent: satu episode break maksimal menghasilkan satu write penalty.
**5.4 Landing Page Architecture (ISR)**  
Landing page menggunakan **Next.js App Router + Incremental Static Regeneration (ISR)** dengan `revalidate` default 60 detik.  
* Data diambil **server-side langsung dari data access layer / Supabase**, bukan dengan memanggil API publik internal sendiri.  
* Source utama landing page: `landing_content`, `services`, `testimonials`.  
* Regenerasi halaman terjadi saat build awal dan saat cache entry expired / direvalidate.  
* Saat owner/admin update konten dari admin panel → trigger invalidasi cache landing.
  * Baseline minimum: `revalidatePath('/')`
  * Opsi lebih granular: `revalidateTag()` untuk section/data tertentu
* Hasilnya:
  * landing tetap SEO-friendly
  * tidak membutuhkan SSR penuh di setiap request
  * update konten masuk cepat tanpa redeploy
* Asset publik seperti gambar layanan atau visual statis menggunakan CDN / `next/image`.
* Efek ambient background tetap diutamakan berbasis CSS / gradient agar ringan dan tidak membebani render.  
  
## 6. DATA MODELS  
**6.1 users**  
```
users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('owner', 'admin', 'member')),
  avatar_url      TEXT,
  is_deleted      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

```
**Catatan:** `users.id` menggunakan ID yang sama dengan `auth.users.id` agar Supabase Auth dan tabel aplikasi tetap sinkron.  
**Catatan tambahan:** v1 memakai archive/deactivate-first untuk lifecycle worker. `is_deleted` / status nonaktif dipakai untuk menghentikan akses tanpa hard delete UI. Pengelolaan `auth.users` tidak boleh diasumsikan selesai hanya karena row aplikasi terhapus.  
**6.2 worker_profiles**  
```
worker_profiles (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_role       TEXT NOT NULL,           -- e.g., "Professional Player", "Expert Player"
  gid                 TEXT,                    -- Game Identifier / internal worker identifier
  shift               TEXT NOT NULL
                      CHECK (shift IN ('A','1','B','C','2','D','E','3','F','flexible')),
  shift_start_hour    SMALLINT CHECK (shift_start_hour BETWEEN 0 AND 23),
  shift_start_min     SMALLINT CHECK (shift_start_min BETWEEN 0 AND 59),
  shift_end_hour      SMALLINT CHECK (shift_end_hour BETWEEN 0 AND 23),
  shift_end_min       SMALLINT CHECK (shift_end_min BETWEEN 0 AND 59),
  is_flexible         BOOLEAN DEFAULT false,
  show_card           BOOLEAN DEFAULT true,
  cuti_stock          SMALLINT DEFAULT 12 CHECK (cuti_stock >= 0),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
)

```
**Catatan:** Jika `shift = 'flexible'`, maka `is_flexible` harus bernilai `true`.  
**6.3 worker_status**  
```
worker_status (
  user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version                 BIGINT DEFAULT 0,       -- Optimistic locking
  status                  TEXT NOT NULL DEFAULT 'off'
                          CHECK (status IN ('off','on','break','cuti','sakit','pending','lembur')),
  alpha_done              BOOLEAN DEFAULT false,
  break_timer_running     BOOLEAN DEFAULT false,
  break_started_at        TIMESTAMPTZ,
  break_accumulated_secs  INTEGER DEFAULT 0,
  break_late_recorded     BOOLEAN DEFAULT false,
  shift_started_at        TIMESTAMPTZ,
  late_started_at         TIMESTAMPTZ,
  lembur_started_at       TIMESTAMPTZ,
  sakit_started_at        TIMESTAMPTZ,
  sakit_set_date          DATE,
  pending_started_at      TIMESTAMPTZ,
  cuti_set_date           DATE,
  shift_active_label      TEXT,                   -- snapshot shift saat siklus aktif berjalan
  shift_active_start_hour SMALLINT,
  shift_active_start_min  SMALLINT,
  shift_active_end_hour   SMALLINT,
  shift_active_end_min    SMALLINT,
  updated_at              TIMESTAMPTZ DEFAULT now()
)

```
**Catatan:** Status LATE bukan nilai DB. Ini adalah **derived state** — client dan cron menghitung LATE dari kondisi: `status='off' AND alpha_done=false AND IN-SHIFT AND grace period ≥ 10 menit`.  
**Catatan tambahan:** Timer BREAK dihitung dari kombinasi `break_started_at`, `break_accumulated_secs`, dan `break_timer_running`.  
**Catatan tambahan:** `worker_status` adalah source of truth untuk current operational state. Tabel ini tidak menyimpan `LATE` sebagai DB status.  
**Catatan tambahan:** `break_late_recorded` digunakan untuk menjamin `BREAK_LATE` hanya tercatat sekali per break episode.  
**6.4 worker_attendance**  
```
worker_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          TEXT NOT NULL
                  CHECK (status IN ('hadir','alpha','cuti','sakit','pending')),
  is_scheduled    BOOLEAN DEFAULT true,
  source          TEXT NOT NULL DEFAULT 'system'
                  CHECK (source IN ('manual','cron','system')),
  notes           TEXT,
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
)

```
**Catatan tambahan:** `worker_attendance` adalah source of truth untuk hasil kehadiran harian. Koreksi `ALPHA` hanya dilakukan dari flow Absensi/Admin correction, bukan tracker.  
**6.5 worker_records**  
```
worker_records (
  user_id                   UUID REFERENCES users(id) ON DELETE CASCADE,
  month                     DATE NOT NULL,        -- First day of month: 2025-04-01
  work_late_mins            INTEGER DEFAULT 0,
  work_late_override        INTEGER,              -- Manual override by admin/owner
  break_late_mins           INTEGER DEFAULT 0,
  break_late_override       INTEGER,
  alpha                     SMALLINT DEFAULT 0,
  alpha_override            SMALLINT,
  cuti_stock                SMALLINT DEFAULT 12,
  cuti_stock_override       SMALLINT,
  sakit_days                NUMERIC(6,2) DEFAULT 0,
  sakit_override            NUMERIC(6,2),
  pending_days              NUMERIC(6,2) DEFAULT 0,
  pending_override          NUMERIC(6,2),
  lembur_units              INTEGER DEFAULT 0,
  lembur_override_units     INTEGER,
  updated_by                UUID REFERENCES users(id),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, month)
)

```
**Catatan:** `cuti_stock` di tabel ini adalah snapshot/sisa cuti pada bulan berjalan agar rekap bulanan konsisten saat dilihat historis.  
**Catatan tambahan:** `worker_records` adalah source of truth untuk agregat/reporting bulanan.  
**Catatan tambahan:** Semua metrik lembur diakumulasi dalam satu unit internal yang konsisten. Konversi ke tampilan jam dilakukan saat reporting/read layer.  
**Catatan tambahan:** Jika field override terisi, auto recalculation tidak boleh menimpa nilai override tersebut.  
**6.6 worker_sp**  
```
worker_sp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  given_at    TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  given_by    UUID REFERENCES users(id),
  revoked_by  UUID REFERENCES users(id),
  revoked_at  TIMESTAMPTZ,                  -- NULL = masih aktif, non-NULL = dicabut
  created_at  TIMESTAMPTZ DEFAULT now()
)

```
SP dianggap aktif jika: `expires_at > NOW() AND revoked_at IS NULL`.  
**6.7 app_settings**  
```
app_settings (
  key         TEXT PRIMARY KEY,
  value_json  JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
)

```
Contoh key:
* `system_reset_at`
* `cron_last_run`
* `maintenance_mode`  
**6.8 landing_content**  
```
landing_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section         TEXT NOT NULL,         -- 'hero', 'stats', 'why', 'how_it_works', 'footer'
  content_key     TEXT NOT NULL,
  content_value   JSONB NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section, content_key)
)

```
**Catatan:** JSONB dipakai agar section bisa menyimpan string sederhana maupun struktur yang lebih kaya tanpa perlu ubah schema. FAQ tidak disimpan sebagai `landing_content.faq.*` pada v1. FAQ memakai dedicated rows/table agar CRUD dan validasi lebih stabil.  
**FAQ Items (baru v1)**  
```
faq_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  sort_order      SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

```
**6.9 testimonials**  
```
testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name  TEXT NOT NULL,
  game        TEXT NOT NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL,
  avatar_url  TEXT,
  is_visible  BOOLEAN DEFAULT false,
  sort_order  SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
)

```
**6.10 services**  
```
services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name       TEXT NOT NULL,
  service_type    TEXT NOT NULL
                  CHECK (service_type IN ('Rank Boost', 'Quest Completion', 'Account Leveling', 'Custom')),
  description     TEXT,
  icon_url        TEXT,
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT true,
  sort_order      SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

```
**6.11 access_permissions**  
```
access_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier        TEXT NOT NULL CHECK (tier IN ('admin','member')), -- Owner selalu full, tidak perlu row
  resource    TEXT NOT NULL,     -- 'dashboard', 'tracker', 'absensi', 'records', 'users', 'content', 'access-manager', 'profile'
  action      TEXT NOT NULL CHECK (action IN ('view','action','create','edit','delete','reset')),
  allowed     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tier, resource, action)
)

```
**Catatan:** Tabel ini tetap boleh dipertahankan untuk seed/default matrix dan evaluasi server-side, tetapi tidak ada UI konfigurasi permission yang shipped pada v1.  
**6.12 access_logs**  
```
access_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by  UUID REFERENCES users(id),
  target_tier TEXT NOT NULL CHECK (target_tier IN ('admin','member')),
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  old_value   BOOLEAN,
  new_value   BOOLEAN,
  created_at  TIMESTAMPTZ DEFAULT now()
)

```
**Catatan:** `access_logs` khusus untuk perubahan matrix/default permission, bukan general audit trail.  
**6.13 audit_logs**  
```
audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES users(id),
  target_user_id  UUID REFERENCES users(id),
  domain          TEXT NOT NULL,
  action          TEXT NOT NULL,
  payload_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now()
)

```
**Catatan:** `audit_logs` mencatat semua mutasi sensitif operasional dan CMS pada v1.  

**Audit Coverage Matrix**  
| Domain | Action examples | Audit required |
| --------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Tracker | `START`, `SELESAI`, `CUTI`, `SAKIT`, `PENDING`, `LEMBUR`, reset status | Yes |
| Absensi | edit cell, current-day correction, koreksi `ALPHA` | Yes |
| Records | manual override, reset records | Yes |
| Users | create worker, edit worker, deactivate/archive worker | Yes |
| SP | give SP, revoke SP | Yes |
| Content | update landing content, services, testimonials, FAQ | Yes |
| Permissions / bootstrap | seed default matrix, reset default matrix | Yes (`access_logs` dan/atau `audit_logs`) |

**Relasi Diagram (Ringkas)**  
```
auth.users
  └── users (1:1 app profile)
      ├── worker_profiles (1:1)
      ├── worker_status (1:1)
      ├── worker_attendance (1:N)
      ├── worker_records (1:N per month)
      ├── worker_sp (1:N)
      │   ├── given_by → users
      │   └── revoked_by → users
      ├── access_logs.changed_by → users
      └── audit_logs.actor_user_id / target_user_id → users

access_permissions   -> static permission matrix v1
app_settings         -> global system flags / timestamps
landing_content      -> editable public content (non-FAQ)
faq_items            -> editable public FAQ rows
testimonials         -> editable public testimonials
services             -> editable public services

```
  
## 7. API SPECIFICATIONS  
Base URL: `/api`  
Auth:
* Staff/admin endpoints: Supabase JWT via `Authorization: Bearer <token>` atau cookie session
* Cron endpoint: `Authorization: Bearer {CRON_SECRET}`
* Public read endpoints: no auth

**Catatan implementasi:** Untuk landing page App Router, server components boleh membaca data langsung dari data access layer / Supabase. Endpoint public read di bawah tetap tersedia untuk CMS, preview, atau konsumsi eksternal bila diperlukan.  
Authorization v1 tidak hanya bergantung pada JWT. Semua endpoint mutasi harus memvalidasi actor scope, target ownership, dan permission matrix default di server. Operasi privileged tertentu wajib dijalankan lewat service-role-only server flow.  
  
**7.1 Tracker**  
```
GET /api/tracker

```
Mendapatkan data grid tracker sesuai filter aktif.  
**Query Params:** `?search=&shift=&status=&role=&sort=&page=1&limit=50`  
**Response 200:**  
```
{
  "data": [
    {
      "user_id": "uuid",
      "name": "Budi",
      "employee_role": "Professional Player",
      "shift": "A",
      "status": "on",
      "derived_status": null,
      "sp_count": 1,
      "work_late_mins": 15,
      "cuti_stock": 10,
      "version": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 87
  },
  "last_sync_at": "2025-04-25T11:00:00Z"
}

```
Catatan v1:
* Untuk `Member`, response hanya boleh memuat worker milik sendiri.
* Response wajib menyertakan `derived_status` hasil komputasi server.
  
```
POST /api/tracker/action

```
Mengubah status worker melalui aksi manual.  
**Request Body:**  
```
{
  "user_id": "uuid",
  "version": 12,
  "action": "START" | "SELESAI" | "ISTIRAHAT" | "PAUSE" | "RESUME" | "STOP"
            | "CUTI" | "BATAL_CUTI" | "SAKIT" | "BATAL_SAKIT"
            | "PENDING" | "BATAL_PENDING" | "LEMBUR" | "BATAL_LEMBUR"
}

```
**Response 200:**  
```
{
  "success": true,
  "new_status": "on",
  "worker_status": { ...updated worker_status row },
  "version": 13
}

```
**Response 422:**  
```
{
  "success": false,
  "error": "INVALID_TRANSITION",
  "message": "Cannot START from current status 'on'"
}

```
**Response 403:**  
```
{
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "Your tier does not have permission to perform actions on tracker"
}

```
**Response 409:**  
```
{
  "success": false,
  "error": "VERSION_CONFLICT",
  "message": "Worker state has changed, please refresh latest data"
}

```
Catatan v1:
* Endpoint ini tidak menerima koreksi `ALPHA`.
* `Member` tidak memiliki hak action manual pada tracker v1.
* Semua mutasi sukses wajib menulis `audit_logs`.
  
```
POST /api/tracker/reset

```
Reset massal semua worker status (Owner only).  
**Request Body:**  
```
{
  "confirmation": "RESET"
}

```
**Response 200:**  
```
{
  "success": true,
  "reset_count": 47,
  "reset_at": "2025-04-23T10:00:00Z",
  "lockout_until": "2025-04-23T10:06:00Z"
}

```
  
**7.2 Absensi**  
```
GET /api/absensi?month=2025-04

```
Mendapatkan semua data absensi untuk bulan tertentu.  
**Query Params:** `?month=2025-04&search=&shift=&role=`  
**Response 200:**  
```
{
  "month": "2025-04",
  "data": [
    {
      "user_id": "uuid",
      "name": "Budi",
      "attendance": {
        "2025-04-01": "hadir",
        "2025-04-02": "alpha",
        "2025-04-03": null
      }
    }
  ]
}

```
  
```
PATCH /api/absensi/cell

```
Edit satu cell absensi.  
**Request Body:**  
```
{
  "user_id": "uuid",
  "date": "2025-04-15",
  "status": "hadir" | "alpha" | "cuti" | "sakit" | "pending",
  "notes": "optional note"
}

```
**Response 200:**  
```
{
  "success": true,
  "updated_attendance": { ...row },
  "updated_records_delta": { "alpha": -1 },
  "updated_tracker_status": { ...optional_if_current_day }
}

```
Catatan v1:
* Tidak ada future scheduling.
* Tidak ada `Custom Text`.
* Koreksi worker yang sudah `ALPHA` hanya dilakukan dari endpoint ini / flow admin correction yang setara.
* Perubahan current day yang mempengaruhi tracker wajib mengembalikan snapshot tracker terbaru beserta `derived_status`.
  
**7.3 Records**  
```
GET /api/records?month=2025-04

```
Mendapatkan records bulanan semua worker.  
**Query Params:** `?month=2025-04&search=&shift=&role=&sort=&page=1&limit=25`  
**Response 200:**  
```
{
  "month": "2025-04",
  "data": [
    {
      "user_id": "uuid",
      "name": "Budi",
      "work_late_mins": 45,
      "break_late_mins": 10,
      "alpha": 1,
      "cuti_stock": 11,
      "sakit_days": 1,
      "pending_days": 0,
      "lembur_units": 120
    }
  ]
}

```
  
```
PATCH /api/records/:userId

```
Edit record worker tertentu (dengan override flag).  
**Request Body:**  
```
{
  "month": "2025-04",
  "work_late_override": 45,
  "break_late_override": 10,
  "alpha_override": 2,
  "cuti_stock_override": 11,
  "sakit_override": 1,
  "pending_override": 0,
  "lembur_override_units": 120
}

```
**Response 200:**  
```
{
  "success": true,
  "updated_record": { ...row }
}

```
Catatan v1:
* Kontrak storage dan API menggunakan `lembur_units`.
* Layer baca/UI boleh menampilkan hasil konversi ke jam tanpa mengubah kontrak penyimpanan.
  
```
POST /api/records/reset

```
Reset semua records bulan ini ke zero (Owner only).  
**Request Body:**  
```
{
  "month": "2025-04",
  "confirmation": "RESET RECORDS"
}

```
**Response 200:**  
```
{
  "success": true,
  "reset_count": 47,
  "month": "2025-04"
}

```
  
**7.4 Users / Workers**  
```
GET /api/users

```
List semua worker (member tier) untuk Owner/Admin.  
**Query Params:** `?search=&shift=&role=&sp_level=&status=&page=1&limit=25`  
**Response 200:**  
```
{
  "data": [
    {
      "user_id": "uuid",
      "name": "Budi",
      "email": "budi@example.com",
      "tier": "member",
      "employee_role": "Professional Player",
      "shift": "A",
      "status": "on",
      "cuti_stock": 11,
      "sp_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 87
  }
}

```
  
```
POST /api/users

```
Tambah worker baru.  
**Request Body:**  
```
{
  "name": "string",
  "email": "string",
  "password": "string",
  "employee_role": "string",
  "gid": "string",
  "shift": "A" | "1" | "B" | "C" | "2" | "D" | "E" | "3" | "F" | "flexible",
  "cuti_stock": 12,
  "show_card": true,
  "is_flexible": false
}

```
**Catatan:** Endpoint ini khusus membuat akun worker, sehingga `tier` diset ke `member` secara default di sisi server.  
**Response 201:**  
```
{
  "success": true,
  "user_id": "uuid"
}

```
  
```
PATCH /api/users/:userId

```
Update data profil worker.  
**Request Body:**  
```
{
  "name": "string",
  "employee_role": "string",
  "gid": "string",
  "shift": "A",
  "cuti_stock": 11,
  "show_card": true,
  "is_flexible": false
}

```
**Response 200:**  
```
{
  "success": true,
  "updated_user": { ...joined profile row }
}

```
  
```
POST /api/users/:userId/deactivate

```
Nonaktifkan / arsipkan worker (Owner only).  
**Request Body:**  
```
{
  "confirmation_name": "Nama Worker Persis"
}

```
**Response 200:**  
```
{
  "success": true,
  "deactivated_user_id": "uuid"
}

```
**Catatan v1:**  
* Create worker dan deactivate worker adalah privileged flow.  
* Tidak ada hard delete UI / public admin endpoint untuk worker pada v1.  
  
**7.5 SP (Surat Peringatan)**  
```
GET /api/sp/:userId

```
Mendapatkan semua SP (aktif + riwayat) untuk worker tertentu.  
**Response 200:**  
```
{
  "data": [
    {
      "id": "uuid",
      "reason": "string",
      "given_at": "2025-04-01T00:00:00Z",
      "expires_at": "2025-05-01T00:00:00Z",
      "is_active": true
    }
  ]
}

```
  
```
POST /api/sp

```
Memberikan SP baru.  
**Request Body:**  
```
{
  "user_id": "uuid",
  "reason": "string",
  "expires_at": "2025-07-23T00:00:00Z"
}

```
**Response 201:**  
```
{
  "success": true,
  "sp_id": "uuid"
}

```
  
```
PATCH /api/sp/:spId/revoke

```
Mencabut SP yang masih aktif.  
**Response 200:**  
```
{
  "success": true,
  "sp_id": "uuid",
  "revoked_at": "2025-04-25T11:00:00Z"
}

```
  
**7.6 Static Permission Matrix (v1)**  
Tidak ada API CRUD permission matrix yang di-expose untuk UI konfigurasi permission pada v1.  
Default permission matrix didokumentasikan di PRD dan disiapkan saat seed/bootstrap.  
Jika dibutuhkan reset internal, itu dilakukan oleh owner bootstrap flow / privileged maintenance path, bukan halaman admin umum.  
  
**7.7 Landing Content (CMS)**  
```
GET /api/landing-content

```
Semua konten landing page (public, no auth).  
**Response 200:**  
```
{
  "data": [
    {
      "section": "hero",
      "content_key": "headline",
      "content_value": "Level Up Your Game"
    }
  ]
}

```
  
```
PATCH /api/landing-content

```
Update konten (Owner/Admin, dengan field-level restriction: `landing_content.footer.*` hanya boleh diubah Owner).  
**Request Body:**  
```
{
  "section": "hero",
  "content_key": "headline",
  "content_value": "Level Up Your Game, We Handle the Rest"
}

```
**Response 200:**  
```
{
  "success": true
}

```
  
```
GET /api/testimonials

```
Testimonial yang `is_visible = true` (public, no auth).  
  
```
POST /api/testimonials
PATCH /api/testimonials/:id
DELETE /api/testimonials/:id
```
CRUD testimonial (Owner/Admin).  
  
```
GET /api/services

```
Services yang `is_active = true` (public, no auth).  
  
```
POST /api/services
PATCH /api/services/:id
```
CRUD services (Owner/Admin).  
FAQ memakai endpoint dan tabel dedicated (`faq_items`), bukan `landing_content.faq.*`.  
  
**7.8 Cron**  
```
GET /api/auto-trigger

```
Header auth: `Authorization: Bearer {CRON_SECRET}` (env variable, bukan user JWT).  
  
## 8. STATE MACHINE SPECIFICATION  
**8.1 Status Definitions**  

| Status  | Kode DB   | Derivasi? | Deskripsi                                                |
| ------- | --------- | --------- | ---------------------------------------------------------|
| OFF     | off       | Tidak     | Belum/tidak bekerja                                      |
| ON      | on        | Tidak     | Sedang bekerja aktif                                     |
| BREAK   | break     | Tidak     | Sedang istirahat (60 menit / 1 jam); jika melewati durasi maka tercatat break late |
| LATE    | (derived) | Ya        | Terlambat — dihitung dari kondisi                        |
| ALPHA   | (derived) | Ya        | Tidak hadir — ditandai alpha_done=true                   |
| CUTI    | cuti      | Tidak     | Ijin dengan stock yang dipunya                           |
| SAKIT   | sakit     | Tidak     | Izin sakit                                               |
| PENDING | pending   | Tidak     | Ijin urusan urgent, atau sakit > 72 jam, butuh verifikasi |
| LEMBUR  | lembur    | Tidak     | Overtime di luar jam shift                               |
  
**LATE derivation:** status='off' AND alpha_done=false AND is_in_shift=true AND minutes_since_shift_start >= 10  
**ALPHA derivation:** alpha_done=true → ditampilkan sebagai ALPHA di UI  
  
**8.2 Shift Phase Calculation**  
```
Untuk setiap worker, tentukan phase berdasarkan waktu WIB saat ini:

PRE-SHIFT:   current_time < shift_start
IN-SHIFT:    current_time >= shift_start AND current_time < shift_end
POST-SHIFT:  current_time >= shift_end

```
**Cross-midnight shifts (D, E, 3, F):** Gunakan logika hari-span:  
* Shift D (16:00–00:00): IN-SHIFT jika 16:00 ≤ t < 24:00 (hari yang sama).  
* Shift E (22:00–06:00): IN-SHIFT jika 22:00 ≤ t (hari H) ATAU t < 06:00 (hari H+1).  
* Shift 3 (23:00–07:00): IN-SHIFT jika 23:00 ≤ t (hari H) ATAU t < 07:00 (hari H+1).  
* Shift F (00:00–08:00): IN-SHIFT jika 00:00 ≤ t < 08:00 (hari yang sama).  
  
**8.3 Valid Transitions - Sync between Tracker, Absensi, Records (Manual Actions)**  
| Tracker Transition | Absensi Sync | Records Sync | Trigger / Notes |
| ------------------ | ------------ | ------------ | --------------- |
| OFF → ON | `- → H` | `-` | `START` |
| OFF → CUTI | `- → C` | `CUTI: -1` | `CUTI` |
| OFF → SAKIT | `- → S` | `SAKIT: +1d` | `SAKIT` |
| OFF → PENDING | `- → P` | `PENDING: +1d` | `PENDING` |
| OFF → LEMBUR | tetap `-` | mulai akumulasi `LEMBUR` unit internal | `LEMBUR` — hanya valid pada `POST-SHIFT` |
| LATE → ON | `- → H` | `WORK_LATE: sesuai durasi keterlambatan` | `START` |
| LATE → CUTI | `- → C` | `WORK_LATE tidak dicatat` | `CUTI` |
| LATE → SAKIT | `- → S` | `WORK_LATE tidak dicatat` | `SAKIT` |
| LATE → PENDING | `- → P` | `WORK_LATE tidak dicatat` | `PENDING` |
| ALPHA → ALPHA | tetap `A` | `-` | tidak ada aksi tracker; koreksi hanya via Absensi/Admin correction flow |
| ON → OFF | tetap `H` | `-` | `SELESAI` |
| ON → BREAK | tetap `H` | `-` | `ISTIRAHAT` |
| BREAK → BREAK | tetap `H` | `-` | `PAUSE` — pause timer |
| BREAK → BREAK | tetap `H` | `-` | `RESUME` — resume timer |
| BREAK → ON | tetap `H` | `-` | `STOP` — kembali kerja |
| CUTI → OFF | `C → -` sebelum end shift | `CUTI: +1` sebelum end shift | `BATAL CUTI` |
| SAKIT → OFF | `S → -` sebelum end shift | `SAKIT: -1d` sebelum end shift | `BATAL SAKIT` |
| PENDING → OFF | `P → -` sebelum end shift | `PENDING: -1d` sebelum end shift | `BATAL PENDING` |
| LEMBUR → OFF | tetap `-` | finalize / discard akumulasi sesuai rule minimum | `SELESAI` / `BATAL LEMBUR` |

**8.4 Automatic Transitions (Cron)**  
```
IN-SHIFT, off, alpha_done=false, melewati grace period keterlambatan (≥10 menit) → [DISPLAY LATE] (derived only, tidak ubah DB status)
POST-SHIFT, worker masih memenuhi derived LATE dan tidak pernah START → alpha_done=true + attendance='alpha' + records alpha++ (idempotent)
POST-SHIFT, status=on/break → status=off (AUTO OFF SHIFT)
BREAK, total durasi break efektif melewati threshold → catat break_late sekali per break episode
ALPHA, current_time > expiry → alpha_done=false, status=off (ALPHA EXPIRE)
SAKIT, sakit_started_at + 72 jam <= now → status=pending (SAKIT TO PENDING)

```
**8.5 ALPHA Expiry Rules**  

**State-Machine Correction Summary**  
| Skenario | Allowed v1 path | Not allowed in v1 | Notes |
| --------------------- | ------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| `ALPHA` correction | Absensi/Admin correction flow | Tracker action button | Tracker tetap lebih sederhana dan auditable |
| `LATE` display | Derived dari server snapshot + client reconcile | Simpan `late` di DB | Derived-only |
| `BREAK_LATE` | Satu write per break episode | Penalty write berulang | Gunakan episode marker |
| `LEMBUR` reporting | Rounding di reporting boundary | Floor/round di setiap write | Gunakan satu internal unit |

| Shift Type            | Shift         | Expiry Time            |
| --------------------- | ------------- | ---------------------- |
| Same-day (pagi/siang) | A, 1, B, C, 2 | Besok jam 00:00 WIB    |
| Cross-midnight        | D, E, 3       | Besok jam 12:00 WIB    |
| Tengah malam          | F             | Hari ini jam 12:00 WIB |
  
**8.6 State Transition Validation (Server-side)**  
Sebelum setiap aksi tersimpan ke DB, server harus memvalidasi:  
1. Apakah aksi tersebut valid dari status saat ini? (lihat 8.3)  
2. Apakah user yang melakukan aksi memiliki permission?  
3. Apakah kondisi shift phase mendukung aksi? (misal: LEMBUR hanya boleh dari POST-SHIFT atau mendekati POST-SHIFT)  
4. Apakah versioning conflict? (optimistic lock via version field)  
Jika gagal → return 422 dengan error code yang spesifik.  
  
## 9. UI/UX SPECIFICATIONS  
**9.1 Design System**  
**Landing Page**  

| Elemen | Spesifikasi |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Background | #0a0a0f (near black) / #050510 (dark navy) |
| Primary Accent | #e63535 (red) |
| Secondary Accent | #f0c040 (gold/kuning) |
| Text Primary | #ffffff |
| Text Secondary | #a0a0b0 |
| Typography | Plus Jakarta Sans untuk UI utama, JetBrains Mono untuk waktu/konteks monospace |
| Border Radius | 12px card, 8px button, 24px pill badge |
| Glassmorphism | background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08) |
| Glow Effect | box-shadow: 0 0 40px rgba(230,53,53,0.15) untuk red accent elements |
| Referensi Aesthetic | Linear.app — clean, spacious, premium |
  
**Color Mode:** Dark-first dengan dukungan `light`, `dark`, dan `system`.  
**Admin Panel**  

| Elemen | Spesifikasi |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar Width | 240px (collapsed: 60px) |
| Header Height | 56px |
| Card Padding | 16px |
| Status Badge Colors | ON=#22c55e, BREAK=#eab308, LATE=#ea580c, ALPHA=#ef4444, OFF=#6b7280, CUTI=#3b82f6, SAKIT=#f97316, PENDING=#a855f7, LEMBUR=#f59e0b |
| SP Level Colors | SP1=#eab308, SP2=#f97316, SP3=#ef4444 (dengan glow) |
| Dark Mode BG | #0f0f14 |
| Light Mode BG | #f8f8fc |
  
**9.2 Landing Page — Section Specs**  
**Hero Section**  
```
Layout: Full viewport height (100vh), centered content
Background: Dark dengan layered subtle geometric patterns, soft noise texture
Headline: font-size 56px–72px, font-weight 800, letter-spacing -0.02em
Sub-headline: font-size 18px–22px, font-weight 400, color: text-secondary
CTA Button: background: #e63535, color: #fff, padding 14px 32px, border-radius: 8px
           hover: background: #cc2828, box-shadow: 0 0 24px rgba(230,53,53,0.4)
Secondary CTA: outline style, border: 1px solid rgba(255,255,255,0.2)

```
**Services Section**  
```
Layout: Grid 3 kolom (desktop), 2 kolom (tablet), 1 kolom (mobile)
Service Card: glassmorphism, padding 24px
             game image / thumbnail: rasio 16:9 atau square visual, object-fit cover
             icon fallback: 48px × 48px jika image tidak tersedia
             game_name: bold 16px
             service_type: badge pill merah
             description: text-secondary 14px

```
**Testimonials Section**  
```
Slider: auto-play 4 detik, pause on hover
Card: glassmorphism, 5 bintang rating visual
     buyer_name: bold, game: badge pill
     comment: italic text-secondary
Navigation: dots + prev/next arrows

```
**How It Works**  
```
Layout: 4 steps horizontal (desktop), vertical (mobile)
Connector: dashed line antar step
Step circle: numbered, background red accent

```
  
**9.3 Admin Panel — Tracker Card Spec**  
```
Worker Card (width: 280px, min-height: 200px):
┌─────────────────────────────────────┐
│ [Avatar]  Nama Worker          [SP] │  ← SP badge (angka, top-right)
│           Role | Shift              │
│           ┌─────────────┐           │
│           │  STATUS     │           │  ← Status badge colored
│           └─────────────┘           │
│                                     │
│  Work Late: 12 mnt                  │
│  Alpha: 2 | Cuti: 10               │
│                                     │
│  [Break countdown: 00:32:15]        │  ← Hanya jika BREAK
│                                     │
│  [START] [CUTI] [SAKIT]            │  ← Tombol aksi sesuai status
└─────────────────────────────────────┘

SP Level Border:
- SP1: border: 2px solid #eab308
- SP2: border: 2px solid #f97316  
- SP3: border: 2px solid #ef4444; box-shadow: 0 0 16px rgba(239,68,68,0.3)

Nama Worker dengan SP3: color: #ef4444; text-shadow: 0 0 8px rgba(239,68,68,0.5)

```
  
**9.4 Admin Panel — Navigation Sidebar**  
```
Sidebar Items (icons + labels):
- Dashboard        /admin/dashboard
- Tracker          /admin/tracker
- Absensi          /admin/absensi
- Records          /admin/records
- Users            /admin/users        (Owner + Admin)
- Content          /admin/content      (Owner + Admin)
─────────────────────
- Profile          /admin/profile
- Logout

```
Catatan v1: tidak ada sidebar item untuk permission management karena UI konfigurasi permission tidak shipped pada v1.  
Items disembunyikan dari sidebar jika tier tidak memiliki view permission (sesuai access_permissions).  
  
**9.5 Mobile Responsiveness**  

| Breakpoint | Behavior |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| < 640px (mobile) | Sidebar menjadi hamburger drawer/sheet; tracker grid 1 kolom; tabel dengan horizontal scroll |
| 640–1024px (tablet) | Sidebar collapsed (icon only); tracker grid 2 kolom |
| > 1024px (desktop) | Sidebar full; tracker grid 3–4 kolom |
  
## 10. ROUTING & REQUEST GUARD SPECIFICATION  
**10.1 Route Table**  

| Path | Jenis | Auth Required | Tier Diizinkan |
| ----------------------- | --------- | -------------------------------------- | --------------------- |
| / | Public | Tidak | Semua |
| /admin | Admin | Ya | Owner, Admin, Member |
| /admin/login | Auth Page | Tidak (tapi redirect jika sudah login) | — |
| /admin/dashboard | Admin | Ya | Owner, Admin |
| /admin/tracker | Admin | Ya | Owner, Admin, Member (self-only) |
| /admin/absensi | Admin | Ya | Owner, Admin |
| /admin/records | Admin | Ya | Owner, Admin, Member (self-only) |
| /admin/users | Admin | Ya | Owner, Admin |
| /admin/content | Admin | Ya | Owner, Admin |
| /admin/access-manager | Admin | Future Version | - |
| /admin/profile | Admin | Ya | Owner, Admin, Member |
| /admin/profile/[userId] | Admin | Ya | Owner, Admin |
  
**10.2 Request Guard Layer Logic**  
```
// request guard layer (gunakan file convention Next.js yang aktif)
// Tugasnya hanya coarse redirect:
// - public anonymous user -> /admin/login
// - authenticated staff -> first allowed page
// - member mencoba akses non-self route -> redirect ke route self-only yang valid
// Authorization final tetap dilakukan di server route/data layer.
```
**10.3 Server-Side Permission Check**  
Selain request guard layer untuk halaman, setiap API route juga melakukan validasi tier + permission independen (defense in depth):  
```
1. Validate staff session dari header/cookie
2. Resolve actor terbaru dari tabel `users`
3. Terapkan static permission matrix v1
4. Validasi ownership target untuk route/data self-only milik `Member`
5. Jalankan query/mutasi hanya jika lolos RLS dan actor scope
6. Gunakan privileged server flow untuk operasi service-role-only
7. Jika tidak allowed → return 403

```
**10.4 "Staff Login" Link Rules**  
* Hanya ada satu link ke `/admin/login` di seluruh halaman publik: di footer paling bawah.
* Styling: sangat subtle, ukuran kecil, opacity rendah, tidak bold.
* Tidak ada teks `Admin` atau `Panel` dalam link tersebut, hanya `Staff Login`.
* Tidak ada link ke `/admin/login` di navbar, hero, services, atau section publik lain.
  
## 11. CONTENT MANAGEMENT SPECIFICATION  
**11.1 Konten Yang Bisa Diedit dari Admin Panel**  

| Konten | Section DB | Siapa Bisa Edit |
| ---------------------------------------------- | ----------------------------------------- | --------------- |
| Headline Hero | landing_content.hero.headline | Owner, Admin |
| Sub-headline Hero | landing_content.hero.subheadline | Owner, Admin |
| Angka statistik (total orders, buyers, dll) | landing_content.stats.* | Owner, Admin |
| USP cards (Why Kireiku) | landing_content.why.* | Owner, Admin |
| How It Works steps | landing_content.how_it_works.* | Owner, Admin |
| FAQ | faq_items table | Owner, Admin |
| Footer links (G2G, sosmed) | landing_content.footer.* | Owner |
| Services list | services table | Owner, Admin |
| Testimonials | testimonials table | Owner, Admin |
  
**11.2 CMS Interface di Admin Panel**  
Tambahkan halaman /admin/content (hanya Owner dan Admin):  
```
Tabs:
1. General (hero, stats, why, how it works, footer)
2. Services (CRUD tabel services)
3. Testimonials (CRUD tabel testimonials)
4. FAQ (CRUD FAQ items)

```
Setiap update konten dari admin panel memanggil revalidatePath('/') (Next.js ISR revalidation) agar landing page ter-update dalam ≤ 60 detik tanpa redeploy.  
Field `landing_content.footer.*` tetap tampil di tab General, tetapi untuk Admin harus read-only/disabled karena hanya Owner yang boleh mengubah footer links.  
**11.3 Services CMS**  
```
Form tambah/edit service:
- Game Name (text input)
- Service Type (dropdown: Rank Boost, Quest Completion, Account Leveling, Custom)
- Description (textarea, max 200 char)
- Icon URL (text input + preview)
- Image URL (text input/upload source + preview)
- Is Active (toggle)
- Sort Order (number input)

```
**11.4 Testimonials CMS**  
```
Form tambah/edit testimonial:
- Buyer Name (nickname, bisa anonim)
- Game (text input)
- Rating (1–5 star selector)
- Comment (textarea, max 500 char)
- Avatar URL (text input/upload source + preview)
- Is Visible (toggle — default OFF untuk review baru agar bisa di-moderate dulu)
- Sort Order (number)

```
  
## 12. EDGE CASES & ERROR HANDLING  
**12.1 State Machine Edge Cases**  

| Skenario | Penanganan |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dua admin klik "START" bersamaan untuk worker yang sama | Optimistic locking via version field. Yang pertama masuk sukses, yang kedua → 409 Conflict, client refresh state. |
| Cron jalan saat Reset Status baru dilakukan | Anti-loop guard: cek system_reset_at dari Redis, skip jika dalam 6 menit terakhir. |
| Worker pindah shift di tengah shift aktif | shift_active_* di worker_status tidak langsung ter-override; shift baru berlaku pada siklus berikutnya (setelah current shift selesai). |
| Break timer mencapai 1 jam persis saat user sedang tidak ada koneksi | Server-side BREAK_LATE tercatat di cron berdasarkan total durasi break efektif, bukan real-time client. Data tetap konsisten. |
| Flexible worker tidak di-assign shift | Semua cron rules untuk flexible worker (AUTO_LATE, AUTO_ALPHA) di-skip. Tracker card tidak menampilkan shift badge. |
| Worker dalam status SAKIT selama tepat 72 jam | Cron cek sakit_started_at + 72 jam <= now() → trigger SAKIT_TO_PENDING. Border case: gunakan strict ≥, bukan >. |
| Reset Records dilakukan bersamaan dengan cron update records | Gunakan DB transaction + advisory lock untuk reset. Cron write harus menunggu atau retry jika advisory lock reset masih aktif. |
| Cross-midnight shift, absensi cut-off date | Attendance entry dicatat dengan tanggal shift_start (hari H), bukan hari H+1 saat shift berakhir. |
| Worker reconnect setelah lama offline saat sebenarnya sudah masuk kondisi `LATE` | Client wajib refetch snapshot tracker dari server; `derived_status` dihitung ulang dari row mentah, bukan mengandalkan event realtime yang terlewat. |
| Worker sudah `ALPHA` lalu perlu koreksi hadir/sakit/cuti | Koreksi hanya lewat Absensi/Admin correction flow; tracker tidak menyediakan shortcut correction. |
| BREAK_LATE dievaluasi berkali-kali selama satu episode break | Gunakan flag/marker episode (`break_late_recorded`) agar penalty hanya tercatat sekali. |
  
**12.2 Auth & Access Edge Cases**  

| Skenario | Penanganan |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public anonymous user mengetik langsung URL /admin/tracker | Request guard layer redirect ke /admin/login. |
| JWT expired saat user sedang aktif di tracker | Supabase client auto-refresh token. Jika gagal refresh → redirect ke /admin/login?redirect=/admin/tracker. |
| Admin tier di-downgrade ke member saat sedang login | Pada request berikutnya, request guard layer membaca tier terbaru dari DB, bukan hanya dari JWT. Gunakan server-side session validation per request untuk halaman sensitif. |
| Owner menonaktifkan worker yang sedang login | Session worker menjadi invalid pada request berikutnya dan user dipaksa keluar. |
| Member mengakses /admin/tracker | Hanya data milik sendiri yang boleh tampil. |
| Member mengakses /admin/records worker lain / /admin/profile/[userId] orang lain | Redirect ke resource profile/records milik sendiri. |
  
**12.3 Data Integrity Edge Cases**  

| Skenario | Penanganan |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| work_late_mins di records melebihi durasi shift | Validasi server-side: work_late_mins ≤ shift_duration_minutes. Jika override, validasi sama berlaku. |
| cuti_stock menjadi negatif | Validasi: tidak bisa set CUTI jika cuti_stock <= 0, dan override manual juga tidak boleh menyimpan nilai negatif agar tetap konsisten dengan schema dan aturan bisnis. |
| SP expires_at di masa lalu saat dibuat | Validasi: expires_at harus > given_at + 1 hari. |
| Edit absensi di masa lalu mengubah records yang sudah di-override | Ketika edit cell absensi, cek apakah field yang bersangkutan di records memiliki override value. Jika ada override, jangan auto-recalculate — tampilkan warning ke admin: "Field ini memiliki override manual, ubah override secara terpisah jika diperlukan." |
| worker_profiles.cuti_stock dan worker_records.cuti_stock tidak sinkron | worker_profiles.cuti_stock tetap dianggap current source of truth; snapshot worker_records.cuti_stock hanya diperbarui lewat flow bulanan / koreksi yang disetujui. |
| Edit absensi harian bertabrakan dengan override records | Override aktif selalu menang; auto aggregate hanya boleh menyentuh field tanpa override. |
  
**12.4 UI Edge Cases**  

| Skenario | Penanganan |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Realtime terputus | Tampilkan banner "Koneksi realtime terputus - data mungkin tidak terkini" dengan tombol Reconnect. Auto-reconnect setiap 5 detik. |
| Worker card dengan nama sangat panjang | CSS overflow: hidden; text-overflow: ellipsis; white-space: nowrap dengan tooltip full name on hover. |
| Grid tracker dengan 0 worker | Empty state: ilustrasi + teks "Tidak ada worker yang ditampilkan. Cek filter atau tambah worker baru." |
| Cron endpoint error | Log ke console/monitoring. Next run 1 menit kemudian berjalan independent — tidak ada cascading failure. |
| Landing page saat semua services is_active=false | Tampilkan section Services dengan teks "Layanan segera tersedia" sebagai fallback. |
  
**12.5 Performance Edge Cases**  

| Skenario | Penanganan |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 100+ worker cards di tracker | Virtualisasi list dengan react-window atau @tanstack/virtual untuk render hanya visible cards. |
| Realtime update 100 perubahan worker bersamaan | Batch DB write per change-set kecil, lalu biarkan Supabase Realtime mengalirkan row-change event per worker yang berubah, bukan update terpisah per field. |
| Redis unavailable | Fallback ke DB query langsung dengan warning log. Performa sedikit menurun tapi system tetap berjalan. |
  
## 13. TESTING REQUIREMENTS  
**13.1 Critical Test Cases — Auth & Access**  

| Test ID | Skenario | Expected Result |
| ------- | ---------------------------------------------- | -------------------------------------------------- |
| AUTH-01 | Public anonymous user akses /admin/tracker langsung via URL | Redirect ke /admin/login |
| AUTH-02 | Member akses /admin/access-manager | Route tidak shipped / redirect ke halaman self-only yang valid |
| AUTH-03 | Member akses /admin/dashboard | Redirect ke halaman self-only yang valid |
| AUTH-04 | Member akses /admin/tracker | Hanya worker miliknya sendiri yang tampil |
| AUTH-05 | Member akses /admin/profile/[userId] milik orang lain | Redirect ke profil sendiri |
| AUTH-06 | Session expired → aksi di tracker | Redirect ke login dengan redirect param |
| AUTH-07 | RLS query Member ke data worker lain | Ditolak di database / tidak ada row yang terbaca |
| AUTH-08 | Create worker memakai token user biasa | Ditolak; hanya privileged flow yang boleh |
  
**13.2 Critical Test Cases — State Machine**  

| Test ID | Skenario | Expected Result |
| ------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| SM-01 | START dari status ON | 422 INVALID_TRANSITION |
| SM-02 | Worker OFF, IN-SHIFT, 10 menit berlalu | Status display = LATE, DB status = off |
| SM-03 | Worker memenuhi derived LATE, POST-SHIFT, tidak pernah START | alpha_done=true, attendance='alpha', records alpha++ |
| SM-04 | Worker ON, POST-SHIFT | Status → OFF (AUTO_OFF_SHIFT) |
| SM-05 | Worker BREAK, threshold tercapai, cron berjalan berulang | BREAK_LATE tercatat sekali untuk episode tersebut |
| SM-06 | Worker SAKIT, sakit_started_at + 72 jam | Status → PENDING |
| SM-07 | Reset Status, lalu cron berjalan dalam 2 menit | Cron di-skip (POST_RESET_LOCKOUT) |
| SM-08 | Reset Status, lalu tunggu 7 menit, cron berjalan | Cron berjalan normal |
| SM-09 | Shift cross-midnight (E: 22:00–06:00), cek IN-SHIFT pada 03:00 WIB hari berikutnya | IN-SHIFT = true |
| SM-10 | Optimistic lock: dua request START bersamaan untuk worker sama | Yang pertama sukses (200), yang kedua 409 |
| SM-11 | Worker tampil ALPHA, admin ingin koreksi | Koreksi hanya berhasil lewat Absensi/Admin correction flow |
| SM-12 | LEMBUR diselesaikan pada reporting boundary | Nilai reporting dibulatkan dari unit internal, bukan selama episode berjalan |
  
**13.3 Critical Test Cases — Cron**  

| Test ID | Skenario | Expected Result |
| ------- | --------------------------------------------------- | ----------------------------------------- |
| CRON-01 | Flexible worker, IN-SHIFT, 15 menit, status=off | Tidak ada AUTO_LATE |
| CRON-02 | Non-flexible worker, IN-SHIFT, 15 menit, status=off | Display LATE (alpha_done=false confirmed) |
| CRON-03 | ALPHA worker, current_time > expiry | Status → OFF, alpha_done=false |
| CRON-04 | ALPHA worker, current_time < expiry | Status tetap ALPHA |
| CRON-05 | Reconnect setelah event AUTO_LATE tidak pernah menghasilkan row-change | Snapshot tracker berikutnya tetap mengembalikan derived_status=LATE |
| CRON-06 | AUTO_ALPHA dieksekusi dua kali untuk worker dan tanggal yang sama | Hanya satu write attendance/records yang tercatat |
  
**13.4 Critical Test Cases — SP System**  

| Test ID | Skenario | Expected Result |
| ------- | ----------------------------- | -------------------------------------- |
| SP-01 | Worker dengan 3 SP aktif | Border merah, nama merah, SP badge = 3 |
| SP-02 | Worker dengan SP expired saja | SP badge = 0, styling normal |
| SP-03 | SP yang sudah expire dicabut | Error — SP sudah tidak aktif |
  
**13.5 Critical Test Cases — Landing Page**  

| Test ID | Skenario | Expected Result |
| ------- | ------------------------------------ | ----------------------------------- |
| LAND-01 | Klik "Order Now" | Buka tab baru ke g2g.com/KireiBoost |
| LAND-02 | Link "Staff Login" di footer | Navigate ke /admin/login |
| LAND-03 | Landing page tidak ada service aktif | Fallback text tampil, tidak crash |
| LAND-04 | Lighthouse audit landing page | Performance ≥ 85, SEO ≥ 85 |
  
**13.6 Test Tools yang Direkomendasikan**  

| Layer | Tools |
| -------------------------------- | --------------------------------------------- |
| Unit tests (state machine logic) | Vitest |
| Integration tests (API routes) | Vitest + Supertest |
| E2E tests | Playwright |
| Auth flow E2E | Playwright |
| Performance | Lighthouse CI (dalam pipeline GitHub Actions) |
| DB migrations | Supabase CLI local testing |
  
## 14. IMPLEMENTATION PHASES  
**Phase 1 — Foundation & Landing Page (2–3 minggu)**  
**Goal:** Landing page fully functional, production-ready, dan dapat diakses publik.  
```
Week 1:
- Setup project: Next.js App Router, TypeScript, Supabase, Vercel
- Setup DB schema: users, landing_content, services, testimonials
- Supabase Auth setup: staff auth email/password only
- Landing page: Hero section + Services section
- Basic design system (CSS variables, dark theme)

Week 2:
- Landing page: Why Kireiku + Testimonials + How It Works + FAQ + Footer
- ISR setup untuk landing page (revalidate 60s)
- SEO: meta tags, OG tags, sitemap, robots.txt
- Mobile responsiveness semua section
- Lighthouse audit dan optimasi

Week 3:
- Content management halaman `/admin/content` (basic CRUD untuk landing content)
- Auth flow: login page, session management, request guard layer setup dasar
- Deploy to Vercel, test E2E landing page
- Lighthouse score validation (target ≥ 85)

```
**Phase 2 — Admin Core: Tracker + Auth (2–3 minggu)**  
**Goal:** Sistem tracking worker real-time dapat beroperasi.  
```
Week 4:
- Complete DB schema: worker_profiles, worker_status, worker_attendance, worker_records
- Request guard layer + server-side auth/RLS boundary untuk semua /admin/* paths
- Admin panel layout: sidebar, header, navigation
- Dashboard halaman: summary cards + live clock WIB

Week 5:
- Tracker halaman: worker card grid, status badges
- State machine implementation (semua status + derivasi LATE/ALPHA)
- Action buttons per status (semua aksi manual)
- Realtime via Supabase Realtime (subscription per worker)

Week 6:
- Break countdown timer (client-side realtime)
- SP system: worker_sp table, SP badge di worker card
- Filter, search, sort di tracker
- Reset Status (Owner only) dengan modal konfirmasi

```
**Phase 3 — Admin Operations: Absensi + Records + Users (2 minggu)**  
**Goal:** Semua halaman operasional admin berfungsi lengkap.  
```
Week 7:
- Halaman Absensi: kalender grid bulanan, edit cell, sync ke records
- Halaman Records: tabel bulanan, edit individual, reset records (Owner only)

Week 8:
- Halaman Users Manager: create/edit worker, manage SP, deactivate/archive worker
- Profile halaman (sendiri + profil worker lain)
- Cuti stock management

```
**Phase 4 — Cron Engine + Hardening (1–2 minggu)**  
**Goal:** Otomasi status worker via cron, hardening otorisasi, dan validasi static permission matrix v1.  
```
Week 9:
- Cron engine: /api/auto-trigger semua 7 trigger
- Anti-loop guard (Redis + app_settings)
- Shift phase calculation (termasuk cross-midnight shifts)

Week 10:
- Audit logs dan access_logs untuk default permission events
- Static permission matrix validation
- Integration testing cron + realtime + manual actions

```
**Phase 5 — QA, Polish & Launch (1–2 minggu)**  
```
Week 11–12:
- E2E testing semua critical test cases
- Load testing tracker dengan 100 worker cards simulasi
- Security audit (auth guards, input validation, rate limiting)
- Performance optimization (bundle size, image optimization)
- Bug fixes dari QA
- Soft launch (Owner + Admin test in production)
- Full launch

```
  
## 15. TECH STACK RECOMMENDATIONS  
**15.1 Stack Yang Dipertahankan (dari planning awal)**  
Stack awal sudah solid untuk kebutuhan sistem ini. Tidak ada alasan fundamental untuk mengganti core stack:  

| Layer | Tech | Alasan Dipertahankan |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Frontend | Next.js App Router (stable current version) + TypeScript | ISR untuk landing page optimal, server components efisien untuk admin, ekosistem terbaik untuk full-stack |
| State Management | Zustand | Lightweight, cukup untuk state UI tracker |
| Database | Supabase PostgreSQL | Realtime subscription built-in, Auth built-in, RPC untuk complex transactions |
| Realtime | Supabase Realtime | Native dengan DB, tidak perlu WebSocket server terpisah |
| Auth | Supabase Auth | Staff auth email/password untuk Owner, Admin, Member; tidak ada authenticated customer flow di v1 |
| Cache | Upstash Redis | Serverless Redis, cocok untuk Vercel, TTL support |
| Deployment | Vercel | Seamless Next.js, Cron Jobs built-in, request guard layer support |
| Forms | React Hook Form + Zod | Form admin banyak dan kompleks; kombinasi ini paling efisien untuk form state + validasi |
| Styling | ShadCN + Tailwind CSS | Komponen accessible, mudah dikustom dengan light dan dark theme, bisa diswitch antar mode dan ada opsi untuk default by system device |
  
**15.2 Rekomendasi Tambahan / Perubahan**  
**✅ TAMBAHKAN: Cron via Vercel Cron Jobs (bukan external)**  
Gunakan **Vercel Cron Jobs** langsung (tersedia di Vercel Pro) daripada external cron service. Konfigurasi di vercel.json:  
```
{
  "crons": [{
    "path": "/api/auto-trigger",
    "schedule": "* * * * *"
  }]
}

```
Keuntungan: zero tambahan infrastructure, reliable, terintegrasi dengan deployment Vercel.  
**✅ TAMBAHKAN: Tanstack Query (React Query) untuk data fetching**  
Tambahkan **@tanstack/react-query** untuk caching dan synchronization data di admin panel. Saat ini Zustand bagus untuk UI state, tapi React Query lebih superior untuk server state (fetching, caching, background refetch).  
```
Zustand     → UI state: sidebar collapsed, active filters, modal state
React Query → Server state: worker data, records, users list

```
**✅ TAMBAHKAN: Zod untuk schema validation**  
**Zod** untuk runtime type validation di semua API endpoints dan form submissions. Integrasi natural dengan TypeScript. Validasi input dari client terjamin konsisten dengan validasi server.  
**✅ GANTI: Inline styles → Tailwind CSS (jika fleksibel)**  
Dari planning awal menggunakan "Inline styles, CSS variables". Rekomendasi: gunakan **Tailwind CSS** sebagai base utility dengan CSS variables untuk theming. ShadCN sudah menggunakan Tailwind. Gabungan Tailwind + CSS variables lebih maintainable dibanding inline styles.  
**🔧 UNTUK V2 (Tidak urgent v1): Payroll System**  
Untuk sistem perhitungan gaji yang disebut di planning, rekomendasi untuk v2:  
* Jangan integrasikan payroll software HRIS eksternal (Talenta, Mekari) — terlalu besar overhead untuk tim kecil.  
* Bangun **custom payroll calculator** di dalam Kireiku App sendiri, berbasis data yang sudah ada: worker_records (work_late, alpha, lembur, sakit) + rate per jam/menit yang dikonfigurasi owner.  
* Tabel baru yang diperlukan: payroll_rates (rate per tier/role), payroll_runs (hasil kalkulasi per bulan per worker).  
* Ini lebih efisien dan data sudah tersedia dari sistem yang dibangun di v1.  
**🔧 UNTUK V2: Worker Notification (Alpha Alert)**  
Untuk "motif worker Alpha" yang disebut di konteks, rekomendasi v2:  
* **Integrasi WhatsApp API (Fonnte / WA Business API)** — lebih efektif dari email untuk notifikasi Alpha ke worker.  
* Atau **Telegram Bot** — lebih murah, reliable, dan bisa group notification.  
* Trigger: cron AUTO_ALPHA → kirim notifikasi ke worker yang bersangkutan.  
* Simpan phone_number atau telegram_id di worker_profiles.  
**15.3 Final Recommended Stack**  
```
Core Framework:     Next.js App Router (stable current version) + TypeScript
UI Library:         ShadCN UI + Tailwind CSS + CSS Variables
Server State:       @tanstack/react-query v5
UI State:           Zustand
Forms:              React Hook Form + Zod
Validation:         Zod (client + server)
Database:           Supabase PostgreSQL
Realtime:           Supabase Realtime (WebSocket)
Auth:               Supabase Auth (staff email/password only)
Cache:              Upstash Redis (serverless)
Cron:               Vercel Cron Jobs (built-in)
Deployment:         Vercel Pro
Animations:         Framer Motion (landing page scroll effects)
Icons:              Lucide React
Charts:             Recharts (dashboard)
Testing:            Vitest + Playwright
CI/CD:              GitHub Actions + Vercel Preview Deployments

```
  
## APPENDIX  
**A. Shift Reference Table**  

| Label | Start | End   | Cross-midnight? | ALPHA Expiry       |
| ----- | ----- | ----- | --------------- | ------------------ |
| A     | 06:00 | 14:00 | Tidak           | Besok 00:00 WIB    |
| 1     | 07:00 | 15:00 | Tidak           | Besok 00:00 WIB    |
| B     | 08:00 | 16:00 | Tidak           | Besok 00:00 WIB    |
| C     | 14:00 | 22:00 | Tidak           | Besok 00:00 WIB    |
| 2     | 15:00 | 23:00 | Tidak           | Besok 00:00 WIB    |
| D     | 16:00 | 00:00 | Ya              | Besok 12:00 WIB    |
| E     | 22:00 | 06:00 | Ya              | Besok 12:00 WIB    |
| 3     | 23:00 | 07:00 | Ya              | Besok 12:00 WIB    |
| F     | 00:00 | 08:00 | Ya*             | Hari ini 12:00 WIB |
  
*Shift F dianggap cross-midnight karena dimulai tengah malam.  
**B. Default Permission Matrix**  

| Halaman / Fitur          | Owner | Admin | Member |
| ------------------------ | ----- | ----- | ------ |
| Dashboard (view)         | ✓     | ✓     | ✗      |
| Tracker (view)           | ✓     | ✓     | ✓ self-only |
| Tracker (action buttons) | ✓     | ✓     | ✗      |
| Tracker (reset status)   | ✓     | ✗     | ✗      |
| Absensi (view)           | ✓     | ✓     | ✗      |
| Absensi (edit cell)      | ✓     | ✓     | ✗      |
| Records (view)           | ✓     | ✓     | ✓ self-only |
| Records (edit)           | ✓     | ✓     | ✗      |
| Records (reset)          | ✓     | ✗     | ✗      |
| Users Manager (view)     | ✓     | ✓     | ✗      |
| Users Manager (deactivate/archive) | ✓ | ✗ | ✗ |
| Access Manager UI        | Future Version | Future Version | Future Version |
| Content Manager          | ✓     | ✓     | ✗      |
| Profile (sendiri)        | ✓     | ✓     | ✓      |
| Profile (user lain)      | ✓     | ✓     | ✗      |
  
Owner permission bersifat hardcoded. v1 memakai static permission matrix dan tidak memiliki UI konfigurasi permission yang shipped.  
**C. SP Level Summary**  

| SP Aktif | Level      | Visual Cue                                     |
| -------- | ---------- | ---------------------------------------------- |
| 0        | Normal     | Tidak ada indikator                            |
| 1        | SP Level 1 | Border kuning, SP badge = 1                    |
| 2        | SP Level 2 | Border oranye, SP badge = 2                    |
| 3+       | SP Level 3 | Border merah + glow, nama merah, SP badge = 3+ |
  
SP aktif = expires_at > NOW() AND revoked_at IS NULL  
  
*PRD ini dirancang sebagai referensi tunggal (single source of truth) untuk pengembangan Kireiku App v1. PRD v1 frozen setelah Release 0 amendments. Setiap perubahan berikutnya harus didokumentasikan sebagai amandemen atau revisi v1.x.*  
*Document Version: 1.0 — April 2026*
