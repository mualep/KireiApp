-- Release 1 local/dev seed baseline for Kireiku App.
-- Seed files run after migrations during `supabase db reset`.
-- Owner bootstrap note: do not insert real users or auth.users rows here.
-- Create the first Owner via a privileged local/admin flow, then add the matching public.users row.

insert into public.app_settings (key, value_json)
values
  ('system_reset_at', '{"value": null, "timezone": "Asia/Jakarta"}'::jsonb),
  ('cron_last_run', '{"value": null, "timezone": "Asia/Jakarta"}'::jsonb),
  ('maintenance_mode', '{"enabled": false, "message": null}'::jsonb)
on conflict (key) do nothing;

insert into public.access_permissions (tier, resource, action, allowed)
values
  -- Admin: broad operational access, but no resets, deactivate/archive, or Access Manager UI.
  ('admin', 'dashboard', 'view', true),
  ('admin', 'tracker', 'view', true),
  ('admin', 'tracker', 'action', true),
  ('admin', 'tracker', 'reset', false),
  ('admin', 'absensi', 'view', true),
  ('admin', 'absensi', 'edit', true),
  ('admin', 'records', 'view', true),
  ('admin', 'records', 'edit', true),
  ('admin', 'records', 'reset', false),
  ('admin', 'users', 'view', true),
  ('admin', 'users', 'create', true),
  ('admin', 'users', 'edit', true),
  ('admin', 'users', 'delete', false),
  ('admin', 'content', 'view', true),
  ('admin', 'content', 'create', true),
  ('admin', 'content', 'edit', true),
  ('admin', 'content', 'delete', false),
  ('admin', 'profile', 'view', true),
  ('admin', 'profile', 'edit', true),
  ('admin', 'access-manager', 'view', false),
  ('admin', 'access-manager', 'action', false),

  -- Member: self-only read surfaces; no action buttons or admin surfaces.
  ('member', 'dashboard', 'view', false),
  ('member', 'tracker', 'view', true),
  ('member', 'tracker', 'action', false),
  ('member', 'tracker', 'reset', false),
  ('member', 'absensi', 'view', false),
  ('member', 'absensi', 'edit', false),
  ('member', 'records', 'view', true),
  ('member', 'records', 'edit', false),
  ('member', 'records', 'reset', false),
  ('member', 'users', 'view', false),
  ('member', 'users', 'create', false),
  ('member', 'users', 'edit', false),
  ('member', 'users', 'delete', false),
  ('member', 'content', 'view', false),
  ('member', 'content', 'create', false),
  ('member', 'content', 'edit', false),
  ('member', 'content', 'delete', false),
  ('member', 'profile', 'view', true),
  ('member', 'profile', 'edit', true),
  ('member', 'access-manager', 'view', false),
  ('member', 'access-manager', 'action', false)
on conflict (tier, resource, action) do update
set
  allowed = excluded.allowed,
  updated_at = now();

insert into public.landing_content (section, content_key, content_value)
values
  ('hero', 'eyebrow', '"Kireiku Game Boosting"'::jsonb),
  ('hero', 'headline', '"Level Up Your Game,\nWe Handle The Rest"'::jsonb),
  ('hero', 'subheadline', '"Fast, safe, and reliable boosting services for Mobile Legends, Valorant, Genshin Impact, and more. Dominate the leaderboards with professional players at your side."'::jsonb),
  ('hero', 'primary_cta_label', '"Order Now"'::jsonb),
  ('hero', 'primary_cta_href', '"https://www.g2g.com/KireiBoost"'::jsonb),
  ('hero', 'secondary_cta_label', '"Explore Services"'::jsonb),
  ('hero', 'secondary_cta_href', '"#services"'::jsonb),
  ('hero', 'services_heading', '"Our Services"'::jsonb),
  ('hero', 'services_subheadline', '"Everything you need to reach the top. Tailored progression for your favorite titles by verified professionals."'::jsonb),
  ('hero', 'testimonials_heading', '"Customer Reviews"'::jsonb),
  ('hero', 'testimonials_subheadline', '"Do not just take our word for it. Hear from buyers who reached their goals with us."'::jsonb),

  ('stats', 'orders_completed', '{"label": "Order selesai", "value": 1200, "suffix": "+"}'::jsonb),
  ('stats', 'happy_buyers', '{"label": "Buyer terbantu", "value": 850, "suffix": "+"}'::jsonb),
  ('stats', 'supported_games', '{"label": "Game populer", "value": 8, "suffix": "+"}'::jsonb),
  ('stats', 'service_years', '{"label": "Tahun pengalaman", "value": 3, "suffix": "+"}'::jsonb),

  ('why', 'heading', '"Why Kireiku"'::jsonb),
  ('why', 'subheadline', '"A safer boost lobby built around clear communication, focused execution, and consistent support."'::jsonb),
  ('why', 'cards', '[
    {
      "title": "Proses jelas",
      "description": "Setiap order diarahkan dengan informasi layanan, estimasi, dan komunikasi yang tertata."
    },
    {
      "title": "Tim terkurasi",
      "description": "Pekerjaan ditangani oleh booster yang mengikuti standar operasional Kireiku."
    },
    {
      "title": "Fokus keamanan",
      "description": "Instruksi akun dan progres ditangani secara hati-hati sesuai kebutuhan tiap game."
    },
    {
      "title": "Support responsif",
      "description": "Tim Kireiku menjaga komunikasi tetap rapi agar buyer tahu progres dan langkah berikutnya."
    }
  ]'::jsonb),

  ('how_it_works', 'eyebrow', '"How It Works"'::jsonb),
  ('how_it_works', 'heading', '"A simple path from request to completed progress."'::jsonb),
  ('how_it_works', 'subheadline', '"The order flow stays lightweight, predictable, and easy to follow."'::jsonb),
  ('how_it_works', 'steps', '[
    {
      "title": "Pilih layanan",
      "description": "Buyer memilih game, jenis boosting, dan target progres yang diinginkan."
    },
    {
      "title": "Konfirmasi detail",
      "description": "Tim Kireiku mengonfirmasi scope, estimasi, dan kebutuhan order sebelum mulai."
    },
    {
      "title": "Pantau progres",
      "description": "Order dikerjakan bertahap dengan update yang rapi sampai target selesai."
    }
  ]'::jsonb),

  ('footer', 'brand_summary', '"Kireiku adalah layanan game boosting yang mengutamakan proses rapi, komunikasi jelas, dan pengalaman buyer yang nyaman."'::jsonb),
  ('footer', 'g2g_url', '"https://www.g2g.com/KireiBoost"'::jsonb),
  ('footer', 'social_links', '[
    {
      "label": "Instagram",
      "href": "https://instagram.com/kireiku"
    },
    {
      "label": "TikTok",
      "href": "https://tiktok.com/@kireiku"
    }
  ]'::jsonb),
  ('footer', 'copyright', '"© 2026 Kireiku. All rights reserved."'::jsonb)
on conflict (section, content_key) do nothing;

insert into public.faq_items (id, question, answer, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'Layanan apa saja yang tersedia di Kireiku?',
    'Kireiku menyediakan layanan seperti rank boost, quest completion, account leveling, dan request custom sesuai game yang didukung.',
    10
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'Bagaimana proses order dimulai?',
    'Buyer memilih layanan, mengirim detail kebutuhan, lalu tim Kireiku mengonfirmasi scope dan estimasi sebelum pekerjaan dimulai.',
    20
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'Apakah progres order bisa dipantau?',
    'Ya. Tim Kireiku akan memberikan update progres sesuai alur komunikasi yang disepakati untuk setiap order.',
    30
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    'Apakah akun buyer aman?',
    'Kireiku mengutamakan proses yang hati-hati dan hanya meminta informasi yang diperlukan untuk menyelesaikan layanan.',
    40
  )
on conflict (id) do nothing;

insert into public.services (id, game_name, service_type, description, icon_url, image_url, is_active, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000201',
    'Mobile Legends',
    'Rank Boost',
    'Bantuan push rank bertahap dengan booster berpengalaman dan proses yang tertata.',
    null,
    null,
    true,
    10
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'Valorant',
    'Rank Boost',
    'Layanan peningkatan rank dengan koordinasi detail target dan estimasi pengerjaan.',
    null,
    null,
    true,
    20
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    'Genshin Impact',
    'Quest Completion',
    'Bantuan penyelesaian quest, eksplorasi, dan progres akun sesuai kebutuhan buyer.',
    null,
    null,
    true,
    30
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    'Custom Request',
    'Custom',
    'Diskusikan kebutuhan khusus untuk game atau target progres yang belum tercantum.',
    null,
    null,
    true,
    40
  )
on conflict (id) do nothing;

insert into public.testimonials (id, buyer_name, game, rating, comment, avatar_url, is_visible, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'Sample Buyer A',
    'Mobile Legends',
    5,
    'Placeholder testimonial untuk kebutuhan local/dev. Ganti dengan testimoni terverifikasi sebelum ditampilkan.',
    null,
    false,
    10
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'Sample Buyer B',
    'Valorant',
    5,
    'Placeholder testimonial yang sengaja tidak terlihat publik secara default.',
    null,
    false,
    20
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    'Sample Buyer C',
    'Genshin Impact',
    4,
    'Placeholder testimonial untuk memvalidasi CMS dan query ordering di lingkungan lokal.',
    null,
    false,
    30
  )
on conflict (id) do nothing;
