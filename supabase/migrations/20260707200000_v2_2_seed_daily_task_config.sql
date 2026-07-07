-- Migration: Phase V2-2 Seed default daily_task_config items
INSERT INTO public.daily_task_config (game, phase, sort_order, label, is_active)
VALUES
  -- Phase: before_work
  ('_before_work', 'before_work', 1, 'Baca Note Buyer dengan Hati-hati', true),
  ('_before_work', 'before_work', 2, 'Buka Game yang dimainkan, SS Before', true),
  ('_before_work', 'before_work', 3, 'Menyiapkan Streaming & Laporkan Streaming ke CS, Paste streaming di employee report', true),

  -- Phase: while_work (Maple Story)
  ('Maple Story', 'while_work', 1, 'Cek Inventory, Preset Grinding, Legion, Buff', true),
  ('Maple Story', 'while_work', 2, 'BA setiap 1 jam sekali dan Screenshot setiap BA', true),
  ('Maple Story', 'while_work', 3, 'Gunakan Buff tepat pada waktunya', true),
  ('Maple Story', 'while_work', 4, 'Kurangi bermain HP agar bisa lebih fokus', true),

  -- Phase: while_work (Black Desert)
  ('Black Desert', 'while_work', 1, 'Cek Kristal terlebih dahulu', true),
  ('Black Desert', 'while_work', 2, 'Aktifkan semua buff yang sudah tertera di Note', true),
  ('Black Desert', 'while_work', 3, 'Tulis Di Note player setiap ada Kristal yang hancur *kasih tanggal* hancurnya', true),

  -- Phase: while_work (Lainnya)
  ('Lainnya', 'while_work', 1, 'Cek item apa saja yang boleh digunakan', true),
  ('Lainnya', 'while_work', 2, 'Double Check job di note boosting', true),

  -- Phase: after_work
  ('_after_work', 'after_work', 1, 'SS after', true),
  ('_after_work', 'after_work', 2, 'Update Employee Report', true),
  ('_after_work', 'after_work', 3, 'Berikan Update ke CS bahwa akun ini sudah selesai dikerjakan.', true)
ON CONFLICT (id) DO NOTHING;
