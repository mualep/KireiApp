-- Seed default records for landing_content
INSERT INTO public.landing_content (section, content_key, content_value)
VALUES
  ('hero', 'eyebrow', '"Kireiku Game Boosting"'),
  ('hero', 'headline', '"Level Up Your Game,\nWe Handle The Rest"'),
  ('hero', 'subheadline', '"Fast, safe, and reliable boosting services for Mobile Legends, Valorant, Genshin Impact, and more. Dominate the leaderboards with professional players at your side."'),
  ('hero', 'primary_cta_label', '"Order Now"'),
  ('hero', 'secondary_cta_label', '"Explore Services"'),
  ('hero', 'secondary_cta_href', '"#services"'),
  ('hero', 'services_heading', '"Our Services"'),
  ('hero', 'services_subheadline', '"Everything you need to reach the top. Tailored progression for your favorite titles by verified professionals."'),
  ('hero', 'testimonials_heading', '"Customer Reviews"'),
  ('hero', 'testimonials_subheadline', '"Do not just take our word for it. Hear from buyers who reached their goals with us."'),
  ('stats', 'orders_completed', '{"label": "Order selesai", "value": 1200, "suffix": "+"}'),
  ('stats', 'happy_buyers', '{"label": "Buyer terbantu", "value": 850, "suffix": "+"}'),
  ('stats', 'supported_games', '{"label": "Game populer", "value": 8, "suffix": "+"}'),
  ('stats', 'service_years', '{"label": "Tahun pengalaman", "value": 3, "suffix": "+"}'),
  ('why', 'heading', '"Why Kireiku"'),
  ('why', 'subheadline', '"A safer boost lobby built around clear communication, focused execution, and consistent support."'),
  ('why', 'cards', '[
    {"title": "Proses jelas", "description": "Setiap order diarahkan dengan informasi layanan, estimasi, dan komunikasi yang tertata."},
    {"title": "Tim terkurasi", "description": "Pekerjaan ditangani oleh booster yang mengikuti standar operasional Kireiku."},
    {"title": "Fokus keamanan", "description": "Instruksi akun dan progres ditangani secara hati-hati sesuai kebutuhan tiap game."},
    {"title": "Support responsif", "description": "Tim Kireiku menjaga komunikasi tetap rapi agar buyer tahu progres dan langkah berikutnya."}
  ]'),
  ('how_it_works', 'eyebrow', '"How It Works"'),
  ('how_it_works', 'heading', '"A simple path from request to completed progress."'),
  ('how_it_works', 'subheadline', '"The order flow stays lightweight, predictable, and easy to follow."'),
  ('how_it_works', 'steps', '[
    {"title": "Pilih layanan", "description": "Buyer memilih game, jenis boosting, dan target progres yang diinginkan."},
    {"title": "Konfirmasi detail", "description": "Tim Kireiku mengonfirmasi scope, estimasi, dan kebutuhan order sebelum mulai."},
    {"title": "Pantau progres", "description": "Order dikerjakan bertahap dengan update yang rapi sampai target selesai."}
  ]'),
  ('footer', 'brand_summary', '"Kireiku adalah layanan game boosting yang mengutamakan proses rapi, komunikasi jelas, dan pengalaman buyer yang nyaman."'),
  ('footer', 'g2g_url', '"https://www.g2g.com/KireiBoost"'),
  ('footer', 'social_links', '[
    {"label": "Instagram", "href": "https://instagram.com/kireiku"},
    {"label": "TikTok", "href": "https://tiktok.com/@kireiku"}
  ]'),
  ('footer', 'copyright', '"© 2026 Kireiku. All rights reserved."')
ON CONFLICT (section, content_key) DO NOTHING;
