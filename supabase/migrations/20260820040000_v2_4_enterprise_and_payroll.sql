-- Migration: Slice 4.1a - Enterprise Rules, Kompensasi Tracking, and Payroll DB Foundation
-- Provides comprehensive schema for Enterprise Rules, Worker Kompensasi, Payroll Config, and Payroll Runs

-- ============================================================================
-- 1. Alter worker_records with Kompensasi & Telat Izin Columns
-- ============================================================================
ALTER TABLE public.worker_records
  ADD COLUMN IF NOT EXISTS kompensasi_duration_mins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kompensasi_delta_mins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telat_izin_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telat_izin_delta smallint NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. Create worker_kompensasi Table (60-day Retention Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.worker_kompensasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  daily_task_id uuid REFERENCES public.daily_tasks(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  proof_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (now() + interval '60 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_kompensasi_user_date
  ON public.worker_kompensasi (user_id, date);

CREATE INDEX IF NOT EXISTS idx_worker_kompensasi_expires_at
  ON public.worker_kompensasi (expires_at);

-- ============================================================================
-- 3. Create enterprise_rules Table (CMS for Company Operating Guidelines)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.enterprise_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_rules_sort
  ON public.enterprise_rules (sort_order ASC);

-- ============================================================================
-- 4. Create payroll_config Table (Dynamic Calculation Parameters & Overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payroll_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  employee_role text NULL,
  user_id uuid NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value_numeric numeric NOT NULL DEFAULT 0,
  value_type text NOT NULL DEFAULT 'flat', -- 'percentage' | 'flat' | 'multiplier'
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_config_unique_key
  ON public.payroll_config (
    config_key,
    coalesce(employee_role, ''),
    coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ============================================================================
-- 5. Create payroll_runs Table (Monthly Salary Runs & Precise Formula Outputs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month date NOT NULL, -- e.g. 2026-08-01
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_role text NOT NULL,
  shift_label text,

  -- Pendapatan (Subtotal 1)
  base_gaji numeric NOT NULL DEFAULT 0,
  royalty numeric NOT NULL DEFAULT 0,
  uang_bensin numeric NOT NULL DEFAULT 0,
  uang_makan numeric NOT NULL DEFAULT 0,
  bonus_no_alpha numeric NOT NULL DEFAULT 0,
  bonus_no_telat numeric NOT NULL DEFAULT 0,
  subtotal_1 numeric NOT NULL DEFAULT 0,

  -- Snapshot Metrik Kinerja dari Record
  alpha_count integer NOT NULL DEFAULT 0,
  work_late_hours numeric(6,2) NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  kompensasi_hours numeric(6,2) NOT NULL DEFAULT 0,
  telat_izin_count integer NOT NULL DEFAULT 0,
  lembur_hours numeric(6,2) NOT NULL DEFAULT 0,

  -- Rincian Potongan
  potongan_alpha numeric NOT NULL DEFAULT 0,
  potongan_telat numeric NOT NULL DEFAULT 0,
  potongan_pending numeric NOT NULL DEFAULT 0,
  potongan_kompensasi numeric NOT NULL DEFAULT 0,
  potongan_telat_izin numeric NOT NULL DEFAULT 0,
  total_potongan numeric NOT NULL DEFAULT 0,

  -- Subtotal Bersih & Penyesuaian
  subtotal_2 numeric NOT NULL DEFAULT 0,
  bon_amount numeric NOT NULL DEFAULT 0,
  subtotal_3 numeric NOT NULL DEFAULT 0,
  lembur_pay numeric NOT NULL DEFAULT 0,
  take_home_pay numeric NOT NULL DEFAULT 0,

  -- Rekening / Metode Pembayaran
  bank_name text,
  bank_account_number text,
  bank_account_holder text,

  -- Status & Catatan
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'paid'
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_payroll_runs_user_period UNIQUE (user_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period
  ON public.payroll_runs (period_month);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_user
  ON public.payroll_runs (user_id);

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.worker_kompensasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- 6.1 Enterprise Rules Policies (All can read, Owner can edit)
CREATE POLICY "enterprise_rules_read_all"
  ON public.enterprise_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enterprise_rules_owner_all"
  ON public.enterprise_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier = 'owner' AND users.is_deleted = false
    )
  );

-- 6.2 Worker Kompensasi Policies (Owner/Admin manage, Member read own)
CREATE POLICY "worker_kompensasi_select"
  ON public.worker_kompensasi
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier IN ('owner', 'admin') AND users.is_deleted = false
    )
  );

CREATE POLICY "worker_kompensasi_admin_manage"
  ON public.worker_kompensasi
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier IN ('owner', 'admin') AND users.is_deleted = false
    )
  );

-- 6.3 Payroll Config Policies (Owner/Admin read, Owner manage)
CREATE POLICY "payroll_config_admin_read"
  ON public.payroll_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier IN ('owner', 'admin') AND users.is_deleted = false
    )
  );

CREATE POLICY "payroll_config_owner_all"
  ON public.payroll_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier = 'owner' AND users.is_deleted = false
    )
  );

-- 6.4 Payroll Runs Policies (Owner manage all, Admin read, Member read own approved/paid)
CREATE POLICY "payroll_runs_select"
  ON public.payroll_runs
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND status IN ('approved', 'paid'))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier IN ('owner', 'admin') AND users.is_deleted = false
    )
  );

CREATE POLICY "payroll_runs_owner_all"
  ON public.payroll_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.tier = 'owner' AND users.is_deleted = false
    )
  );

-- ============================================================================
-- 7. Seed Initial Payroll Configuration (Default Excel Rules)
-- ============================================================================
INSERT INTO public.payroll_config (config_key, employee_role, user_id, value_numeric, value_type, description)
VALUES
  -- Global Penalty Percentages & Flat Rates
  ('penalty_alpha_pct', NULL, NULL, 0.05, 'percentage', 'Potongan per Alpha (5% dari Total Gaji Sebelum Potongan)'),
  ('penalty_telat_pct', NULL, NULL, 0.0095, 'percentage', 'Potongan per Jam Telat (0.95% dari Total Gaji Sebelum Potongan)'),
  ('penalty_pending_pct', NULL, NULL, 0.033, 'percentage', 'Potongan per Hari Pending/Izin (3.3% dari Total Gaji Sebelum Potongan)'),
  ('penalty_kompensasi_flat', NULL, NULL, 8000, 'flat', 'Potongan per Jam Kompensasi (Rp 8.000 / Jam)'),
  ('penalty_telat_izin_flat', NULL, NULL, 3000, 'flat', 'Denda per 1x Terlambat Izin (Rp 3.000)'),
  ('lembur_rate_flat', NULL, NULL, 10000, 'flat', 'Upah Lembur per Jam (Rp 10.000 / Jam, Tanpa Potongan)'),
  ('uang_makan_default', NULL, NULL, 125000, 'flat', 'Uang Makan Default Bulanan (Rp 125.000)'),
  ('bonus_no_alpha_default', NULL, NULL, 100000, 'flat', 'Bonus Kehadiran Penuh / Tanpa Alpha (Rp 100.000)'),
  ('bonus_no_telat_default', NULL, NULL, 100000, 'flat', 'Bonus Kedisiplinan Waktu / Tanpa Telat (Rp 100.000)'),
  ('bonus_no_alpha_night_shift', NULL, NULL, 125000, 'flat', 'Bonus Tanpa Alpha Khusus Shift 3 / Malam (Rp 125.000)'),
  ('bonus_no_telat_night_shift', NULL, NULL, 125000, 'flat', 'Bonus Tanpa Telat Khusus Shift 3 / Malam (Rp 125.000)'),

  -- Base Gaji per Jabatan (Role)
  ('base_gaji', 'Internship', NULL, 1100000, 'flat', 'Base Gaji Internship'),
  ('base_gaji', 'Player', NULL, 1300000, 'flat', 'Base Gaji Professional Player'),
  ('base_gaji', 'Professional Player', NULL, 1300000, 'flat', 'Base Gaji Professional Player'),
  ('base_gaji', 'Player Expert', NULL, 1450000, 'flat', 'Base Gaji Player Expert (PE)'),
  ('base_gaji', 'Expert Player', NULL, 1450000, 'flat', 'Base Gaji Expert Player (PE)'),
  ('base_gaji', 'Explorer', NULL, 1500000, 'flat', 'Base Gaji Explorer Expedition'),
  ('base_gaji', 'Customer Service', NULL, 2000000, 'flat', 'Base Gaji Customer Service (CS)'),
  ('base_gaji', 'HRD', NULL, 3000000, 'flat', 'Base Gaji Human Resource Development (HRD)'),
  ('base_gaji', 'Security', NULL, 1300000, 'flat', 'Base Gaji Security'),
  ('base_gaji', 'Cleaning Service', NULL, 1100000, 'flat', 'Base Gaji Cleaning Service')
ON CONFLICT (config_key, coalesce(employee_role, ''), coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
DO UPDATE SET
  value_numeric = EXCLUDED.value_numeric,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description,
  updated_at = now();

-- ============================================================================
-- 8. Seed Initial Enterprise Rules (Operating Standards)
-- ============================================================================
INSERT INTO public.enterprise_rules (sort_order, category, title, content)
VALUES
  (
    1,
    'Umum',
    '1. PERATURAN DALAM BEKERJA',
    '1. Berpakaian secara Rapi dan Sopan.
2. Datang lebih awal dari awal waktu kerja untuk meminimalisir Keterlambatan dalam Bekerja. Toleransi Keterlambatan adalah 2 Jam, diatas 2 Jam Karyawan dilarang masuk ke tempat Kerja (Akan terhitung Alpha di Absensi).
3. Saling mengayomi sesama Rekan Kerja agar menciptakan Lingkungan Kerja yang Positif dan Profesional.
4. Dilarang menggunakan Properti Kantor termasuk Keyboard, Mouse, Monitor, Kursi untuk kepentingan diluar Jam Kerja. Komputer hanya boleh digunakan untuk Kepentingan Bekerja.
5. Orang lain selain Karyawan Kireiku dilarang masuk, Orang asing boleh masuk jika sudah mendapatkan izin dari Atasan.
6. Buanglah sampah pada Tempatnya, Karena kebersihan itu sebagian dari Iman.'
  ),
  (
    2,
    'Absensi',
    '2. PERATURAN DAN TATA CARA ABSENSI',
    '1. Ketika Karyawan masuk ke kantor, Karyawan harus absen melalui sistem Tracker/Checklock. Setelah Absensi, Karyawan langsung berkoordinasi dengan Customer Service terkait untuk mendapatkan Job.
2. Setelah Jam Kerja selesai, Karyawan tidak boleh langsung Pulang. Karyawan harus menyelesaikan jam kerja dan melakukan Checklock Pulang / Selesai (Jika Karyawan Lupa maka akan secara Otomatis terhitung Alpha pada hari tersebut).
3. Maksimal Checklock Pulang adalah 2 Jam setelah shift selesai, diatas itu segala checklock apapun tidak akan diterima dan akan terhitung Alpha.'
  ),
  (
    3,
    'Operasional',
    '3. TATA CARA BOOSTING',
    '1. Ketika Karyawan datang wajib langsung ke Customer Service. Setelah diberikan Job Oleh Customer Service, Karyawan wajib langsung Set Up untuk Job Tersebut (Login akun, Set Up Stream, membaca Note Buyer, membaca Note Data Boosting). Player bisa bertanya kepada Player Expert / CS jika dirasa tidak paham.
2. Setelah paham dengan Jobnya, Player wajib mencantumkan Link Streaming dan memposting SS Before Timer dan Selesai ke Laporan Harian (Daily Task).
3. Ketika Player kesulitan dalam mengerjakan Boostingan, Player wajib langsung Konfirmasi ke CS untuk instruksi selanjutnya.
4. Setelah jam bekerja akan habis, Player wajib mengupload sisa waktu ke Imgpile / Imgbox dan menyalin Link tersebut ke Note agar terhindar dari miskomunikasi untuk player selanjutnya.
5. Player bertanggung jawab sepenuhnya kepada Player yang melanjutkan Boostingan di Shift selanjutnya.
6. Dilarang membuka Game diluar Job Boosting dan aplikasi selain Chrome / YouTube / Streaming.

**PERATURAN DALAM GAME (KHUSUS BDO BOOSTER):**
* Mengenai Kristal BDO mati lebih dari 5x karena kelalaian player (Tidur, Teledor, tidak fokus) dikenakan sanksi pemotongan Gaji sesuai Kerugian.
* Kompensasi untuk Crystal BDO adalah Silver, Player Wajib menulis seluruh Kristal yang pecah di Note Player.'
  ),
  (
    4,
    'Operasional',
    '4. TATA CARA SCREENSHOT BEFORE DAN AFTER',
    '- Player wajib mengscreenshot Jam dan Tanggal hari ini sebelum melakukan Boostingan.
- Player wajib mengscreenshot Item, Inventory, Profil, dll. yang berkaitan dengan Game secara lengkap.
- Bukti screenshot BEFORE dan AFTER diwajibkan lengkap dan dapat diakses via URL gambar valid (misal: imgpile.com / postimg.cc).'
  ),
  (
    5,
    'Operasional',
    '5. TATA CARA UPLOAD BUKTI FOTO / STREAMING',
    '1. Unggah bukti gambar ke penyedia hosting gambar (Imgpile, Imgbox, atau Postimg) dan salin tautan langsung ke form Daily Task.
2. Pastikan tautan bersifat publik agar dapat ditinjau oleh Customer Service dan Admin.'
  ),
  (
    6,
    'Payroll',
    '6. RINCIAN GAJIAN BULANAN DAN BONUS',
    '### Struktur Gaji Karyawan

**Gaji Pokok (Base Gaji):**
* Internship: Rp 1.100.000
* Player (Professional Player): Rp 1.300.000
* Player Expert (PE): Rp 1.450.000
* Explorer Expedition: Rp 1.500.000
* Customer Service (CS): Rp 2.000.000
* Human Resource Development (HRD): Rp 3.000.000

---

**Tunjangan dan Bonus:**
* **Uang Makan:** Rp 125.000 / bulan
* **Uang Transport (Bensin):** Rp 10.000 / KM (minimal 7 KM, khusus Player, PE, dan CS)
* **Kehadiran Penuh (Tanpa Alpha):** +Rp 100.000 + tambahan 2x bonus cuti
* **Kedisiplinan Waktu (Tanpa Keterlambatan):** +Rp 100.000 (toleransi keterlambatan maksimal 15 menit)
* **Lembur:** Rp 10.000 / jam (maksimal 7 jam per shift, tidak terkena potongan apapun)

---

**Kebijakan Khusus Shift 3 (Shift Malam):**
* **Tambahan Gaji Pokok:** +Rp 25.000
* **Uang Makan:** Rp 125.000 / bulan
* **Bonus Tanpa Alpha:** Rp 125.000
* **Bonus Tanpa Telat:** Rp 125.000

---

**Program Apresiasi Karyawan (MVP / Beyond The King):**
* Juara 1: Rp 500.000 + 1x bonus cuti
* Juara 2: Rp 300.000
* Juara 3: Rp 200.000
* Juara 4: Rp 100.000
* Juara 5: Rp 50.000
*(Kriteria: 40% Kehadiran, 40% Kinerja, 10% Lembur, 10% Sikap/Attitude)*'
  ),
  (
    7,
    'Payroll',
    '7. KEBIJAKAN PEMOTONGAN GAJI',
    '### Ketentuan Pemotongan Gaji

* **Alpha (Tidak Masuk Tanpa Keterangan):** Potongan sebesar **5% dari Total Gaji Sebelum Potongan** per hari Alpha.
* **Keterlambatan (Work Late):** Potongan sebesar **0,95% dari Total Gaji Sebelum Potongan** per jam keterlambatan.
* **Pending / Izin:** Potongan sebesar **3,3% dari Total Gaji Sebelum Potongan** per hari Pending.
* **Kelalaian Kerja (Kompensasi Timer):** Setiap 1 jam kerugian akibat kelalaian player dikenakan potongan flat **Rp 8.000 / jam**.
* **Terlambat Izin:** Denda flat **Rp 3.000 / 1x kejadian** jika izin diajukan kurang dari 30 menit sebelum shift dimulai.

---

**Ketentuan Surat Dokter (SD):**
* Surat Dokter resmi dari RSUD / Faskes BPJS yang valid → Gaji harian tetap dibayarkan (dianggap masuk).
* Surat dari instansi luar tanpa rujukan valid → Tetap dianggap izin (tidak alpha), namun tidak mendapatkan gaji harian.
* Biaya Administrasi SD (luar instansi utama): Internship (Rp 35.000), Player (Rp 45.000), PE (Rp 50.000), CS (Rp 65.000).

---

**Definisi Total Gaji Sebelum Potongan:**
`Total Gaji = Gaji Pokok + Uang Makan + Uang Transport + Bonus Kehadiran + Bonus Disiplin`
*(Catatan: Upah lembur TIDAK termasuk dalam dasar pemotongan dan ditambahkan penuh di akhir perhitungan).*'
  ),
  (
    8,
    'Kedisiplinan',
    '8. RESET POINT PENALTY DAN AKUMULASI TELAT',
    '- **Point Penalty (SP):** Masa berlaku kadaluarsa SP adalah **6 Bulan (180 hari)** sejak tanggal diterbitkan.
- **Akumulasi Keterlambatan:** Direset setiap 1 bulan sekali pada tanggal cut-off penggajian.'
  ),
  (
    9,
    'Kedisiplinan',
    '9. POINT PENALTY (SURAT PERINGATAN / SP)',
    '- Lupa melakukan screenshot before pada order baru: **1 Point SP**
- Surat Dokter Palsu: **3 Point SP / Langsung Pemutusan Hubungan Kerja (PHK)**
- Alpha lebih dari 6 kali dalam sebulan: **1 Point SP**
- Absen hitam (absen tanpa keterangan berulang): **1 Point SP**'
  ),
  (
    10,
    'Kedisiplinan',
    '10. PERATURAN ISTIRAHAT (BREAK)',
    '- Total waktu Istirahat adalah 1 Jam (60 menit) per shift kerja.
- Waktu istirahat wajib diambil di pertengahan jam kerja, bukan di awal shift.
- Istirahat wajib diaktifkan via Tracker dengan konfirmasi Customer Service.
- Keterlambatan istirahat (Break Late > 60 menit) akan tercatat otomatis pada sistem record dan dikenakan sanksi kedisiplinan.'
  ),
  (
    11,
    'Jabatan',
    '11. WEWENANG DAN TANGGUNG JAWAB PLAYER EXPERT',
    '1. Membimbing dan membagikan rotasi map terbaik via stream/video kepada Player di setiap order baru.
2. Menggantikan tugas Customer Service ketika CS berhalangan hadir.
3. Menjaga kualitas boosting agar meminimalisir komplain dan kerugian buyer.'
  ),
  (
    12,
    'Jabatan',
    '12. KEBIJAKAN MUTLAK CUSTOMER SERVICE',
    '1. CS memiliki wewenang penuh dalam pembagian job dan pengawasan order boosting.
2. Karyawan dilarang mengakses atau memanipulasi data delivery tanpa izin CS.
3. Dilarang mengunduh game di luar order boosting atau konten tidak resmi pada PC kantor.'
  ),
  (
    13,
    'Lembur',
    '13. PERATURAN LEMBURAN (OVERTIME)',
    '1. Bertanya ke Customer Service terlebih dahulu mengenai ketersediaan order yang dapat dilemburkan.
2. Wajib menyertakan screenshot jam mulai dan selesai lembur.
3. Lembur hanya diizinkan setelah jam shift utama selesai (tidak boleh menggunakan jam istirahat).
4. Upah lembur dihitung flat Rp 10.000 / jam dan ditambahkan utuh pada take-home pay tanpa potongan.'
  );
