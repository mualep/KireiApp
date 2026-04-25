# PRD v1 Amendment Patch

Purpose: documentation-only patch text to apply to [PRD — Kireiku App.md](/Users/mualifwijaya/kireiku-app/PRD%20%E2%80%94%20Kireiku%20App.md) before final v1 freeze. This patch incorporates the approved Release 0 decisions and closes the remaining P0 gaps without expanding v1 scope.

## Revision Notes

- Added explicit amendment coverage for `§3.3`, `§3.6`, `§3.9`, `§7.3`, `§9.4`, `§14`, `§15.1`, `§6.8` inline schema text, and the `§6` relation diagram.
- Tightened patch instructions so they are exact replacements/additions/removals, not alternative options.
- Aligned dashboard realtime wording with derived-state behavior for `LATE` and `ALPHA`.
- Aligned records schema and API examples around one internal `LEMBUR` storage unit.
- Added a final pre-apply sweep section for lingering contradiction terms in the main PRD.

## 1. Summary Of PRD Amendments Needed

- Remove authenticated `Customer` from v1 and treat buyers as `Public` anonymous users on the landing page only.
- Lock `Member` as self-only for tracker, records, and profile.
- Replace configurable Access Manager UI with a documented static permission matrix for v1.
- Replace hard delete worker flows with archive/deactivate-first lifecycle in v1; do not ship hard delete UI.
- Add explicit auth boundary language for request guards, server-side permission checks, Supabase RLS, and service-role-only operations.
- Add a source-of-truth matrix so `worker_status`, `worker_attendance`, `worker_records`, `cuti_stock`, and overrides do not conflict.
- Add an explicit derived realtime strategy for `LATE` and `ALPHA`.
- Add a general `audit_logs` model plus required audit coverage.
- Replace FAQ-in-`landing_content` assumptions with dedicated FAQ rows/table.
- Remove Absensi `Custom Text` and future scheduling from v1.
- Remove tracker-based `ALPHA -> START`, define `LEMBUR` accumulation in one internal unit, and define `BREAK_LATE` as write-once per break episode.

## 2. Exact PRD Sections To Edit

- `§1.3`, `§1.4`
- `§2.1`, `§2.3`, `§2.4`
- `§3.1`, `§3.3`, `§3.4`, `§3.5`, `§3.6`, `§3.7`, `§3.8`, `§3.9`, `§3.10`
- `§4.2`, `§4.3`
- `§5.1`, `§5.2`, `§5.3`
- `§6.1`, `§6.3`, `§6.4`, `§6.5`, `§6.8`, `§6 relation diagram`, `§6.11`, `§6.12`
- `§7` intro, `§7.1`, `§7.2`, `§7.3`, `§7.4`, `§7.6`, `§7.7`
- `§8.3`, `§8.4`
- `§9.4`
- `§10.1`, `§10.2`, `§10.3`
- `§11.1`, `§11.2`
- `§12.1`, `§12.2`, `§12.3`
- `§13.1`, `§13.2`, `§13.3`
- `§14`, `§15.1`, `§15.3`
- `Appendix B`

## 3. Patch-Style Amendment Text Grouped By PRD Section

### §1.3 Target Users
Replace the target-user table with:

```md
| Tier / Actor | Siapa | Akses |
| --- | --- | --- |
| Owner | Pemilik Kireiku | Full system — landing page + seluruh admin panel |
| Admin | Manajer / supervisor internal | Admin panel operasional sesuai static permission matrix v1 |
| Member | Karyawan / booster | Admin panel terbatas, self-only untuk tracker, records, dan profile |
| Public | Buyer / calon buyer layanan Kireiku | Landing page only, tanpa akun authenticated v1 |
```

### §1.4 Scope Summary
Replace the first bullet with:

```md
* **In Scope:** Landing page 7 section, admin panel 8 halaman inti, staff auth 3 tier (`Owner`, `Admin`, `Member`), state machine 9 status worker, cron engine, realtime sync, content management dari admin, SP system, static permission matrix v1.
```

Add to the out-of-scope bullet:

```md
* **Out of Scope (v1):** authenticated customer account, future-dated attendance scheduling, configurable Access Manager UI, hard delete worker UI.
```

### §2.1 Owner
Replace the two conflicting stories with:

```md
SEBAGAI Owner,
SAYA INGIN melihat permission matrix default yang terdokumentasi dengan jelas,
AGAR SAYA bisa memahami batas akses Admin dan Member di v1 tanpa harus mengonfigurasi matrix dari UI.

SEBAGAI Owner,
SAYA INGIN menonaktifkan / mengarsipkan worker dengan aman,
AGAR akun worker bisa dihentikan tanpa menghapus riwayat operasional secara destruktif pada v1.
```

### §2.3 Member
Add this sentence after the member stories:

```md
Catatan v1: akses Member bersifat self-only untuk tracker, records, dan profile; Member tidak melihat data worker lain dan tidak memiliki akses ke dashboard, absensi, users, content, atau access manager.
```

### §2.4 Customer
Replace the heading label `Customer` with `Public / Buyer`, then add this note directly below the stories:

```md
Catatan v1: buyer pada sisi publik tidak memiliki akun authenticated. Semua kebutuhan buyer di v1 dilayani sebagai public anonymous user.
```

### §3.1 Authentication & Authorization
Replace `FR-AUTH-01` and `FR-AUTH-02` with:

```md
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
```

### §3.3 Admin Panel — Dashboard
Replace the last acceptance criterion in `FR-DASH-01` with:

```md
* Dashboard mengambil summary status dari snapshot server yang sudah menghitung `derived_status`; Supabase Realtime hanya dipakai untuk patch row-change persisted state, sedangkan counter `LATE` dan `ALPHA` wajib direconcile ulang dari snapshot server saat refetch/reconnect.
```

### §3.4 Admin Panel — Tracker
Replace the action table with:

```md
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
```

Replace the member note with:

```md
* Member yang login hanya bisa melihat tracker miliknya sendiri, tanpa tombol aksi manual pada v1.
* Koreksi `ALPHA` tidak dilakukan dari tracker. Koreksi hanya melalui flow Absensi/Admin correction.
```

### §3.5 Admin Panel — Absensi
Replace the calendar and edit acceptance points with:

```md
* Setiap cell menampilkan status kehadiran: HADIR, ALPHA, CUTI, SAKIT, PENDING.
* Edit cell masa kini/past diperbolehkan sesuai permission dan selalu tercatat di `audit_logs`.
* Edit cell masa depan/future tidak termasuk v1.
* Tidak ada status `Custom Text` pada v1.
```

Add:

```md
* Flow Absensi/Admin correction adalah satu-satunya jalur koreksi untuk worker yang sudah tampil `ALPHA`.
```

### §3.6 Admin Panel — Records
Replace the `FR-REC-01` acceptance bullet that currently says `Lembur (h/jam)` with:

```md
* Kolom: Nama, Role, Shift, Work Late (m/menit, h/jam), Break Late (m/menit, h/jam), Alpha (x/count), Cuti Stock (x/sisa), Sakit (d/hari), Pending (d/hari), Lembur (display hasil konversi dari `lembur_units` internal).
```

Add this note after `FR-REC-02`:

```md
Catatan v1: penyimpanan dan kontrak API untuk lembur memakai satu unit internal `lembur_units`. Konversi ke jam hanya dilakukan di read/reporting layer.
```

### §3.7 Admin Panel — User Manager
Replace `FR-USER-05` with:

```md
**FR-USER-05: Deactivate / Archive Worker (Owner Only)**
* **Requirement:** Owner dapat menonaktifkan worker secara aman tanpa hard delete UI pada v1.
* **Acceptance Criteria:**
    * Konfirmasi jelas sebelum submit.
    * Worker yang dinonaktifkan tidak bisa login lagi dan tidak tampil aktif di operasional harian.
    * Riwayat `worker_attendance`, `worker_records`, `worker_sp`, dan audit tetap dipertahankan.
    * Perubahan lifecycle worker dilakukan melalui privileged flow, bukan client-side delete langsung.
```

### §3.8 Admin Panel — Access Manager
Replace the whole section with:

```md
**FR-ACCESS-01: Static Permission Matrix (Documentation Only)**
* **Requirement:** v1 menggunakan static permission matrix yang terdokumentasi di PRD dan seed default, tanpa configurable Access Manager UI.
* **Acceptance Criteria:**
    * Owner selalu full access.
    * Admin dan Member mengikuti matrix default v1 yang tertulis di PRD.
    * Tidak ada halaman `/admin/access-manager` yang shipped untuk konfigurasi matrix pada v1.
```

### §3.9 Admin Panel — Profile
Replace the phrase `tombol Pecat Worker (Owner only)` in `FR-PROF-02` with:

```md
tombol Nonaktifkan / Arsipkan Worker (Owner only)
```

### §3.10 Auto Engine / Cron
Replace the rule sequence bullets with:

```md
1. `ALPHA_DONE_RESET`: jika `alpha_done=true`, `status=off`, dan sudah masuk siklus shift baru → reset `alpha_done=false`.
2. `AUTO_LATE`: jika `status=off`, `alpha_done=false`, `IN-SHIFT`, dan grace period keterlambatan terlewati → tampilkan `LATE` sebagai derived display state, tanpa write DB.
3. `AUTO_ALPHA`: jika worker akan tetap tampil `LATE` sampai `POST-SHIFT` dan tidak pernah `START` → set `alpha_done=true`, tulis attendance `alpha`, dan update records secara idempotent.
4. `AUTO_OFF_SHIFT`: jika `status=on/break`, `POST-SHIFT` → set `status=off`.
5. `BREAK_LATE`: jika durasi break efektif melewati threshold → catat `break_late` sekali per break episode.
6. `AUTO_ALPHA_EXPIRE`: jika `alpha_done=true` dan expiry terlewati → set `alpha_done=false`, `status=off`.
7. `SAKIT_TO_PENDING`: jika `status=sakit` dan 72 jam terlewati → set `status=pending`.
```

Add:

```md
* `AUTO_ALPHA` tidak boleh menulis berdasarkan pseudo-state `status=late`; rule harus mengevaluasi derived lateness dari row mentah.
* `LEMBUR` diakumulasi dalam satu unit internal konsisten, lalu dibulatkan hanya pada reporting boundary.
```

### §4.2 Security
Replace the entire security table with:

```md
| Requirement | Detail |
| --- | --- |
| Auth Guard | Public anonymous user tidak bisa akses `/admin/*`; validasi server-side wajib |
| Request Guard Layer | Gunakan request guard layer sesuai file convention Next.js yang aktif (`middleware.ts` / `proxy.ts`) hanya untuk coarse redirect, bukan authorization final |
| RLS | Semua tabel operasional staff wajib `ENABLE RLS`; akses self-only dan admin-wide harus ditegakkan di database, bukan hanya app layer |
| Service Role Boundary | Create worker, deactivate/archive worker, owner bootstrap, dan permission reset default hanya boleh lewat privileged server flow |
| Rate Limiting | Berlaku untuk login dan endpoint mutasi sensitif (`tracker/action`, `tracker/reset`, `users`, `records/reset`, `absensi/cell`, `content` mutasi) |
| Audit Logging | Semua mutasi sensitif wajib menulis ke `audit_logs`; `access_logs` tetap khusus perubahan permission/default matrix |
```

### §4.3 Data Consistency
Insert this table after the existing consistency table:

```md
| Domain | Source of truth | Aturan |
| --- | --- | --- |
| Current operational state | `worker_status` | Menyimpan stored state saja, bukan `LATE` |
| Daily attendance | `worker_attendance` | Satu row per worker per tanggal shift, hasil final kehadiran harian |
| Monthly summary | `worker_records` | Agregat bulanan + snapshot reporting |
| Current leave balance | `worker_profiles.cuti_stock` | Canonical current balance |
| Monthly leave snapshot | `worker_records.cuti_stock` | Snapshot histori bulan, bukan source balance berjalan |
| Manual overrides | field override di `worker_records` | Override menang atas auto aggregate sampai diubah manual |
```

### §5.1 High-Level Architecture
Replace references to `Middleware auth guard` / `Next.js Middleware` with:

```md
request guard layer (mengikuti file convention Next.js yang aktif) untuk redirect kasar
```

Add this paragraph after the architecture diagram:

```md
Authorization v1 memakai empat lapis: request guard layer untuk coarse redirect, server-side permission validation pada route/data layer, Supabase RLS pada tabel operasional, dan privileged service-role flow untuk operasi lifecycle / bootstrap yang tidak boleh dieksekusi oleh token user biasa.
```

### §5.2 Data Flow — Tracker Action
Replace the validation and write steps with:

```md
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
        ▼
Apply writes:
- `worker_status` sebagai current state
- `worker_attendance` sebagai daily truth bila perlu
- `worker_records` sebagai aggregate / snapshot bila perlu
- `audit_logs` untuk mutasi sensitif
```

Add:

```md
Untuk display `LATE` dan `ALPHA`, endpoint `GET /api/tracker` wajib mengembalikan row mentah plus `derived_status` hasil komputasi server agar reconnect dan cache patch tetap konsisten.
```

### §5.3 Data Flow — Cron Engine
Add these rules after the mutation list:

```md
Derived realtime strategy v1:
- `LATE` tidak mengandalkan row-change event karena bukan stored DB state.
- Server mengembalikan `derived_status` pada snapshot tracker/dashboard.
- Client boleh menghitung countdown / derived timer ringan secara lokal, tetapi wajib reconcile ulang dari snapshot server saat reconnect, refetch, atau setelah aksi manual.
- `AUTO_ALPHA` dan `ALPHA_DONE_RESET` menghasilkan row-change nyata sehingga realtime stream tetap menjadi sumber event untuk perubahan persisted state.
```

Add:

```md
`BREAK_LATE` wajib idempotent: satu episode break maksimal menghasilkan satu write penalty.
```

### §6.1 users
Replace the schema and notes with:

```md
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

```md
**Catatan tambahan:** v1 memakai archive/deactivate-first untuk lifecycle worker. `is_deleted` / status nonaktif dipakai untuk menghentikan akses tanpa hard delete UI. Pengelolaan `auth.users` tidak boleh diasumsikan selesai hanya karena row aplikasi terhapus.
```

### §6.3 worker_status
Append these notes:

```md
**Catatan tambahan:** `worker_status` adalah source of truth untuk current operational state. Tabel ini tidak menyimpan `LATE` sebagai DB status.
**Catatan tambahan:** `break_late_recorded` digunakan untuk menjamin `BREAK_LATE` hanya tercatat sekali per break episode.
```

### §6.4 worker_attendance
Append this note:

```md
**Catatan tambahan:** `worker_attendance` adalah source of truth untuk hasil kehadiran harian. Koreksi `ALPHA` hanya dilakukan dari flow Absensi/Admin correction, bukan tracker.
```

### §6.5 worker_records
Replace `lembur_hours` and add notes:

```md
  lembur_units               INTEGER DEFAULT 0,
  lembur_override_units      INTEGER,
```

```md
**Catatan tambahan:** `worker_records` adalah source of truth untuk agregat/reporting bulanan.
**Catatan tambahan:** Semua metrik lembur diakumulasi dalam satu unit internal yang konsisten. Konversi ke tampilan jam dilakukan saat reporting/read layer.
**Catatan tambahan:** Jika field override terisi, auto recalculation tidak boleh menimpa nilai override tersebut.
```

### §6.8 landing_content
Replace the `section` comment inside the schema block with:

```md
section         TEXT NOT NULL,         -- 'hero', 'stats', 'why', 'how_it_works', 'footer'
```

Replace the FAQ note with:

```md
**Catatan:** FAQ tidak disimpan sebagai `landing_content.faq.*` pada v1. FAQ memakai dedicated rows/table agar CRUD dan validasi lebih stabil.
```

Insert a new subsection immediately after `§6.8` with title `FAQ Items` and this schema:

```md
faq_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  sort_order      SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### §6.11 access_permissions
Append this note:

```md
**Catatan:** Tabel ini tetap boleh dipertahankan untuk seed/default matrix dan evaluasi server-side, tetapi tidak ada configurable Access Manager UI pada v1.
```

### §6.12 access_logs
Append this note and new subsection:

```md
**Catatan:** `access_logs` khusus untuk perubahan matrix/default permission, bukan general audit trail.
```

```md
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

```md
**Catatan:** `audit_logs` mencatat semua mutasi sensitif operasional dan CMS pada v1.
```

### §6 Relasi Diagram (Ringkas)
Replace the ringkas relation diagram block with:

```md
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

### §7 API Specifications
Add this paragraph after the auth bullets:

```md
Authorization v1 tidak hanya bergantung pada JWT. Semua endpoint mutasi harus memvalidasi actor scope, target ownership, dan permission matrix default di server. Operasi privileged tertentu wajib dijalankan lewat service-role-only server flow.
```

### §7.1 Tracker
Add to `GET /api/tracker`:

```md
Catatan v1:
* Untuk `Member`, response hanya boleh memuat worker milik sendiri.
* Response wajib menyertakan `derived_status` hasil komputasi server.
```

Replace `POST /api/tracker/action` note with:

```md
Catatan v1:
* Endpoint ini tidak menerima koreksi `ALPHA`.
* `Member` tidak memiliki hak action manual pada tracker v1.
* Semua mutasi sukses wajib menulis `audit_logs`.
```

### §7.2 Absensi
Add:

```md
Catatan v1:
* Tidak ada future scheduling.
* Tidak ada `Custom Text`.
* Koreksi worker yang sudah `ALPHA` hanya dilakukan dari endpoint ini / flow admin correction yang setara.
* Perubahan current day yang mempengaruhi tracker wajib mengembalikan snapshot tracker terbaru beserta `derived_status`.
```

### §7.3 Records
Replace the `GET /api/records` response example field `lembur_hours` with:

```md
"lembur_units": 120
```

Replace the `PATCH /api/records/:userId` request-body field `lembur_override` with:

```md
"lembur_override_units": 120
```

Add this note after the `PATCH /api/records/:userId` response example:

```md
Catatan v1:
* Kontrak storage dan API menggunakan `lembur_units`.
* Layer baca/UI boleh menampilkan hasil konversi ke jam tanpa mengubah kontrak penyimpanan.
```

### §7.4 Users / Workers
Replace `DELETE /api/users/:userId` with:

```md
POST /api/users/:userId/deactivate
```

```md
Nonaktifkan / arsipkan worker (Owner only).
```

```md
**Response 200:**
{
  "success": true,
  "deactivated_user_id": "uuid"
}
```

Add:

```md
Catatan v1:
* Create worker dan deactivate worker adalah privileged flow.
* Tidak ada hard delete UI / public admin endpoint untuk worker pada v1.
```

### §7.6 Access Manager
Replace the whole subsection with:

```md
Tidak ada API CRUD permission matrix yang di-expose untuk configurable UI pada v1.
Default permission matrix didokumentasikan di PRD dan disiapkan saat seed/bootstrap.
Jika dibutuhkan reset internal, itu dilakukan oleh owner bootstrap flow / privileged maintenance path, bukan halaman admin umum.
```

### §7.7 Landing Content (CMS)
Add:

```md
FAQ memakai endpoint dan tabel dedicated (`faq_items`), bukan `landing_content.faq.*`.
```

### §8.3 Valid Transitions
Replace the four `ALPHA -> ...` rows with a single row:

```md
| ALPHA → ALPHA | tetap `A` | `-` | tidak ada aksi tracker; koreksi hanya via Absensi/Admin correction flow |
```

Replace the two `LEMBUR` rows with:

```md
| OFF → LEMBUR | tetap `-` | mulai akumulasi `LEMBUR` unit internal | `LEMBUR` — hanya valid pada `POST-SHIFT` |
| LEMBUR → OFF | tetap `-` | finalize / discard akumulasi sesuai rule minimum | `SELESAI` / `BATAL LEMBUR` |
```

### §8.4 Automatic Transitions
Replace the block with:

```md
IN-SHIFT, off, alpha_done=false, melewati grace period keterlambatan (≥10 menit) → [DISPLAY LATE] (derived only, tidak ubah DB status)
POST-SHIFT, worker masih memenuhi derived LATE dan tidak pernah START → alpha_done=true + attendance='alpha' + records alpha++ (idempotent)
POST-SHIFT, status=on/break → status=off
BREAK, total durasi break efektif melewati threshold → catat break_late sekali per break episode
ALPHA, current_time > expiry → alpha_done=false, status=off
SAKIT, sakit_started_at + 72 jam <= now → status=pending
```

### §9.4 Admin Panel — Navigation Sidebar
Remove this line from the sidebar item list:

```md
- Access Manager   /admin/access-manager  (Owner only)
```

Add this note below the sidebar block:

```md
Catatan v1: tidak ada sidebar item untuk Access Manager karena configurable Access Manager UI tidak shipped pada v1.
```

### §10.1 Route Table
Replace the admin route rows with:

```md
| /admin/dashboard | Admin | Ya | Owner, Admin |
| /admin/tracker | Admin | Ya | Owner, Admin, Member (self-only) |
| /admin/absensi | Admin | Ya | Owner, Admin |
| /admin/records | Admin | Ya | Owner, Admin, Member (self-only) |
| /admin/access-manager | Admin | Tidak shipped pada v1 | - |
| /admin/profile | Admin | Ya | Owner, Admin, Member |
| /admin/profile/[userId] | Admin | Ya | Owner, Admin |
```

### §10.2 Middleware Logic
Replace the section title with `Request Guard Layer Logic` and replace the code sample with:

```ts
// request guard layer (gunakan file convention Next.js yang aktif)
// Tugasnya hanya coarse redirect:
// - public anonymous user -> /admin/login
// - authenticated staff -> first allowed page
// - member mencoba akses non-self route -> redirect ke route self-only yang valid
// Authorization final tetap dilakukan di server route/data layer.
```

### §10.3 Server-Side Permission Check
Replace the list with:

```md
1. Validate staff session dari header/cookie.
2. Resolve actor terbaru dari tabel `users`.
3. Terapkan static permission matrix v1.
4. Validasi ownership target untuk route/data self-only milik `Member`.
5. Jalankan query/mutasi hanya jika lolos RLS dan actor scope.
6. Gunakan privileged server flow untuk operasi service-role-only.
7. Jika tidak allowed → return `403`.
```

### §11.1 Konten Yang Bisa Diedit
Replace the FAQ row with:

```md
| FAQ | `faq_items` table | Owner, Admin |
```

### §11.2 CMS Interface
Replace the FAQ note with:

```md
4. FAQ (CRUD `faq_items`)
```

### §12.1 State Machine Edge Cases
Add:

```md
| Worker reconnect setelah lama offline saat sebenarnya sudah masuk kondisi `LATE` | Client wajib refetch snapshot tracker dari server; `derived_status` dihitung ulang dari row mentah, bukan mengandalkan event realtime yang terlewat. |
| Worker sudah `ALPHA` lalu perlu koreksi hadir/sakit/cuti | Koreksi hanya lewat Absensi/Admin correction flow; tracker tidak menyediakan shortcut correction. |
| BREAK_LATE dievaluasi berkali-kali selama satu episode break | Gunakan flag/marker episode (`break_late_recorded`) agar penalty hanya tercatat sekali. |
```

### §12.2 Auth & Access Edge Cases
Replace the row `Customer mengetik langsung URL /admin/tracker` with:

```md
| Public anonymous user mengetik langsung URL `/admin/tracker` | Request guard layer redirect ke `/admin/login`. |
```

Replace the row `Owner hapus user yang sedang login` with:

```md
| Owner menonaktifkan worker yang sedang login | Session worker menjadi invalid pada request berikutnya dan user dipaksa keluar. |
```

Add these rows:

```md
| Member mengakses `/admin/tracker` | Hanya data milik sendiri yang boleh tampil. |
| Member mengakses `/admin/records` worker lain / `/admin/profile/[userId]` orang lain | Redirect ke resource profile/records milik sendiri. |
```

### §12.3 Data Integrity Edge Cases
Add:

```md
| `worker_profiles.cuti_stock` dan `worker_records.cuti_stock` tidak sinkron | `worker_profiles.cuti_stock` tetap dianggap current source of truth; snapshot `worker_records.cuti_stock` hanya diperbarui lewat flow bulanan / koreksi yang disetujui. |
| Edit absensi harian bertabrakan dengan override records | Override aktif selalu menang; auto aggregate hanya boleh menyentuh field tanpa override. |
```

### §13.1 Critical Test Cases — Auth & Access
Replace the table with:

```md
| Test ID | Skenario | Expected Result |
| --- | --- | --- |
| AUTH-01 | Public anonymous user akses `/admin/tracker` langsung via URL | Redirect ke `/admin/login` |
| AUTH-02 | Member akses `/admin/access-manager` | Route tidak shipped / redirect ke halaman self-only yang valid |
| AUTH-03 | Member akses `/admin/dashboard` | Redirect ke halaman self-only yang valid |
| AUTH-04 | Member akses `/admin/tracker` | Hanya worker miliknya sendiri yang tampil |
| AUTH-05 | Member akses `/admin/profile/[userId]` milik orang lain | Redirect ke profil sendiri |
| AUTH-06 | Session expired → aksi di tracker | Redirect ke login dengan redirect param |
| AUTH-07 | RLS query `Member` ke data worker lain | Ditolak di database / tidak ada row yang terbaca |
| AUTH-08 | Create worker memakai token user biasa | Ditolak; hanya privileged flow yang boleh |
```

### §13.2 Critical Test Cases — State Machine
Replace rows `SM-03` and `SM-05`, then add rows `SM-11` and `SM-12`:

```md
| SM-03 | Worker memenuhi derived `LATE`, `POST-SHIFT`, tidak pernah `START` | `alpha_done=true`, attendance=`alpha`, records alpha++ |
| SM-05 | Worker BREAK, threshold tercapai, cron berjalan berulang | `BREAK_LATE` tercatat sekali untuk episode tersebut |
| SM-11 | Worker tampil `ALPHA`, admin ingin koreksi | Koreksi hanya berhasil lewat Absensi/Admin correction flow |
| SM-12 | `LEMBUR` diselesaikan pada reporting boundary | Nilai reporting dibulatkan dari unit internal, bukan selama episode berjalan |
```

### §13.3 Critical Test Cases — Cron
Add:

```md
| CRON-05 | Reconnect setelah event `AUTO_LATE` tidak pernah menghasilkan row-change | Snapshot tracker berikutnya tetap mengembalikan `derived_status=LATE` |
| CRON-06 | `AUTO_ALPHA` dieksekusi dua kali untuk worker dan tanggal yang sama | Hanya satu write attendance/records yang tercatat |
```

### §14 Implementation Phases
Apply these exact roadmap replacements:

```md
Replace `Supabase Auth setup: email/password + Google OAuth` with `Supabase Auth setup: staff auth email/password only`.

Replace `Auth flow: login page, session management, middleware setup dasar` with `Auth flow: login page, session management, request guard layer setup dasar`.

Replace `Auth middleware: tier-based guard untuk semua /admin/* paths` with `Request guard layer + server-side auth/RLS boundary untuk semua /admin/* paths`.

Replace `Halaman Users Manager: CRUD worker, manage SP, hard delete` with `Halaman Users Manager: create/edit worker, manage SP, deactivate/archive worker`.

Replace the phase heading `Phase 4 — Cron Engine + Access Manager` with `Phase 4 — Cron Engine + Hardening`.

Replace the phase goal `Otomasi status worker via cron, permission matrix dikonfigurasi.` with `Otomasi status worker via cron, hardening otorisasi, dan validasi static permission matrix v1.`.

Replace the Week 10 bullets:
- `Access Manager halaman: permission matrix UI, toggle per cell`
- `Access logs`
- `Reset ke default permission`

with:
- `Audit logs dan access_logs untuk default permission events`
- `Static permission matrix validation`
- `Integration testing cron + realtime + manual actions`
```

### §15.1 Stack Yang Dipertahankan
Replace the auth row text `Email/password + Google OAuth dalam satu paket` with:

```md
Staff auth email/password untuk `Owner`, `Admin`, `Member`; tidak ada authenticated customer flow di v1
```

Replace the deployment rationale text `Edge Middleware` with:

```md
request guard layer
```

### §15.3 Final Recommended Stack
Replace auth-related wording with:

```md
| Auth | Supabase Auth | Staff auth email/password untuk `Owner`, `Admin`, `Member`; tidak ada authenticated customer flow di v1 |
```

And replace the final stack line with:

```md
Auth:               Supabase Auth (staff email/password only)
```

### Appendix B Default Permission Matrix
Replace the table with:

```md
| Halaman / Fitur | Owner | Admin | Member |
| --- | --- | --- | --- |
| Dashboard (view) | ✓ | ✓ | ✗ |
| Tracker (view) | ✓ | ✓ | ✓ self-only |
| Tracker (action buttons) | ✓ | ✓ | ✗ |
| Tracker (reset status) | ✓ | ✗ | ✗ |
| Absensi (view) | ✓ | ✓ | ✗ |
| Absensi (edit cell) | ✓ | ✓ | ✗ |
| Records (view) | ✓ | ✓ | ✓ self-only |
| Records (edit) | ✓ | ✓ | ✗ |
| Records (reset) | ✓ | ✗ | ✗ |
| Users Manager (view) | ✓ | ✓ | ✗ |
| Users Manager (deactivate/archive) | ✓ | ✗ | ✗ |
| Access Manager UI | Future Version | Future Version | Future Version |
| Content Manager | ✓ | ✓ | ✗ |
| Profile (sendiri) | ✓ | ✓ | ✓ |
| Profile (user lain) | ✓ | ✓ | ✗ |
```

Replace the sentence `Owner permission bersifat hardcoded dan tidak dapat diubah dari Access Manager.` with:

```md
Owner permission bersifat hardcoded. v1 memakai static permission matrix dan tidak memiliki configurable Access Manager UI yang shipped.
```

## 4. Contradictions To Remove From Existing PRD Text

- Remove all mentions of authenticated `Customer`, `tier=customer`, and Google OAuth for buyer auth in v1.
- Remove all mentions that `Member` can access dashboard, absensi, or broad admin pages beyond self-only tracker, records, and profile.
- Remove all mentions of `ALPHA -> START`, `ALPHA -> CUTI`, `ALPHA -> SAKIT`, and `ALPHA -> PENDING` from tracker/state-machine manual transitions.
- Remove all mentions of Absensi `Custom Text`.
- Remove all mentions of future-dated attendance scheduling in v1.
- Remove `FR-USER-05 Hard Delete Worker` and any “hard delete UI” references from v1 flows, security rows, and implementation phases.
- Remove configurable Access Manager UI/API as a shipped v1 feature.
- Remove `landing_content.faq.*` as the FAQ storage contract.
- Remove `faq` dari komentar `landing_content.section`.
- Remove `Pecat Worker` wording dari profile/admin actions v1.
- Remove `Access Manager` dari sidebar dan roadmap shipped v1.
- Remove `status=late` phrasing as if `late` were a stored DB value.
- Remove `lembur_hours` dari schema/API contract examples.
- Remove `middleware` / `Edge Middleware` wording jika konteksnya adalah request guard layer version-neutral.
- Remove `LEMBUR: +1h dengan floor per 1 jam` as the canonical write rule; keep rounding only at reporting boundary.

## 5. New Tables To Insert Into PRD

### Auth / RLS Matrix Summary

| Surface / Table | Public | Owner | Admin | Member | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Allow | Allow | Allow | Allow | Public landing surface |
| `/admin/dashboard` | Deny | Allow | Allow | Deny | Dashboard is not self-only |
| `/admin/tracker` | Deny | Allow | Allow | Allow self-only | `Member` sees own data only |
| `/admin/records` | Deny | Allow | Allow | Allow self-only | `Member` sees own data only |
| `/admin/absensi` | Deny | Allow | Allow | Deny | Correction flow stays owner/admin |
| `users` | None | All | Limited all | Self-limited | RLS enforced |
| `worker_status` | None | All | All | Self-read | `Member` no manual tracker action |
| `worker_attendance` | None | All | All | Self-read if exposed | Daily truth |
| `worker_records` | None | All | All | Self-read | Override-aware |

### Source-Of-Truth Matrix

| Domain | Source of truth | Secondary / snapshot | Rule |
| --- | --- | --- | --- |
| Current status | `worker_status` | none | Stored state only |
| Derived lateness / alpha display | computed from `worker_status` + shift context | API `derived_status` | Never stored as `late` |
| Daily attendance | `worker_attendance` | tracker side effects | One row per worker/date |
| Monthly summary | `worker_records` | none | Override fields block blind recalc |
| Current leave balance | `worker_profiles.cuti_stock` | `worker_records.cuti_stock` | Profile is canonical current balance |
| Historical leave balance | `worker_records.cuti_stock` | none | Reporting snapshot only |

### State-Machine Correction Summary

| Scenario | Allowed v1 path | Not allowed in v1 | Notes |
| --- | --- | --- | --- |
| `ALPHA` correction | Absensi/Admin correction flow | Tracker action button | Keeps tracker simpler and auditable |
| `LATE` display | Derived from server snapshot + client reconcile | Store `late` in DB | Derived-only |
| `BREAK_LATE` | One write per break episode | Repeated penalty writes | Use episode marker |
| `LEMBUR` reporting | Round at reporting boundary | Floor/round on every write | Use one internal unit |

### Audit Coverage Matrix

| Domain | Action examples | Audit required |
| --- | --- | --- |
| Tracker | `START`, `SELESAI`, `CUTI`, `SAKIT`, `PENDING`, `LEMBUR`, reset status | Yes |
| Absensi | edit cell, current-day correction, `ALPHA` correction | Yes |
| Records | manual override, reset records | Yes |
| Users | create worker, edit worker, deactivate/archive worker | Yes |
| SP | give SP, revoke SP | Yes |
| Content | update landing content, services, testimonials, FAQ | Yes |
| Permissions / bootstrap | seed default matrix, reset default matrix | Yes (`access_logs` and/or `audit_logs`) |

## 6. Final PRD Freeze Checklist After Amendments

- [ ] Main PRD text no longer references authenticated `Customer` in v1.
- [ ] Main PRD text locks `Member` to self-only tracker, records, and profile.
- [ ] Main PRD text replaces hard delete UI with archive/deactivate-first worker lifecycle.
- [ ] Main PRD text removes configurable Access Manager UI from v1 and points to static permission matrix.
- [ ] Main PRD text replaces FAQ storage with dedicated FAQ rows/table.
- [ ] Main PRD text removes Absensi `Custom Text` and future scheduling.
- [ ] Main PRD text removes tracker-based `ALPHA` correction.
- [ ] Main PRD text adds auth/request-guard/RLS/service-role boundaries.
- [ ] Main PRD text adds source-of-truth ownership for status, attendance, records, leave balance, and overrides.
- [ ] Main PRD text adds derived realtime strategy for `LATE` and `ALPHA`.
- [ ] Main PRD text adds `audit_logs` plus audit coverage requirements.
- [ ] Main PRD text updates tests and implementation phases to match the frozen v1 scope.

## 7. Final Pre-Apply Sweep

Before applying this patch to the main PRD, run one last text sweep on [PRD — Kireiku App.md](/Users/mualifwijaya/kireiku-app/PRD%20%E2%80%94%20Kireiku%20App.md) for lingering contradiction terms:

```bash
rg -n "customer|Google OAuth|hard delete|Pecat Worker|Access Manager|landing_content\\.faq|Custom Text|future scheduling|status=late|lembur_hours|middleware|Edge Middleware" "/Users/mualifwijaya/kireiku-app/PRD — Kireiku App.md"
```

The apply step should not be considered complete until each remaining hit is removed or updated to wording that matches this patch.

## 8. Recommendation

The PRD can be frozen as v1 after this amendment patch is applied to the main PRD and the document receives one final editorial pass for section numbering and wording consistency. After these changes, the remaining items are P1/P2 hardening items, not freeze blockers.
