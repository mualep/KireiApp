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
  ('stats', 'orders_completed', '{"label": "Completed orders", "value": 1200, "suffix": "+"}'),
  ('stats', 'happy_buyers', '{"label": "Buyers helped", "value": 850, "suffix": "+"}'),
  ('stats', 'supported_games', '{"label": "Popular games", "value": 8, "suffix": "+"}'),
  ('stats', 'service_years', '{"label": "Years experience", "value": 3, "suffix": "+"}'),
  ('why', 'heading', '"Why Kireiku"'),
  ('why', 'subheadline', '"A safer boost lobby built around clear communication, focused execution, and consistent support."'),
  ('why', 'cards', '[
    {"title": "Clear Process", "description": "Every order is directed with organized service information, estimates, and communication."},
    {"title": "Curated Team", "description": "Work is handled by boosters following Kireiku''s operational standards."},
    {"title": "Security Focus", "description": "Account instructions and progress are handled carefully according to each game''s needs."},
    {"title": "Responsive Support", "description": "The Kireiku team keeps communication neat so buyers know the progress and next steps."}
  ]'),
  ('how_it_works', 'eyebrow', '"How It Works"'),
  ('how_it_works', 'heading', '"A simple path from request to completed progress."'),
  ('how_it_works', 'subheadline', '"The order flow stays lightweight, predictable, and easy to follow."'),
  ('how_it_works', 'steps', '[
    {"title": "Choose a Service", "description": "The buyer selects the game, boosting type, and desired progress target."},
    {"title": "Confirm Details", "description": "The Kireiku team confirms the scope, estimates, and order requirements before starting."},
    {"title": "Monitor Progress", "description": "Orders are processed gradually with neat updates until the target is complete."}
  ]'),
  ('footer', 'brand_summary', '"Kireiku is a game boosting service prioritizing neat processes, clear communication, and a comfortable buyer experience."'),
  ('footer', 'g2g_url', '"https://www.g2g.com/KireiBoost"'),
  ('footer', 'social_links', '[
    {"label": "Instagram", "href": "https://instagram.com/kireiku"},
    {"label": "TikTok", "href": "https://tiktok.com/@kireiku"}
  ]'),
  ('footer', 'copyright', '"© 2026 Kireiku. All rights reserved. Powered by Mualif Candra @mual.alif"')
ON CONFLICT (section, content_key) DO NOTHING;
