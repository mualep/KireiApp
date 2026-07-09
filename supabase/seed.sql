-- Release 1 local/dev seed baseline for KireiApp.
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

  ('stats', 'orders_completed', '{"label": "Completed orders", "value": 1200, "suffix": "+"}'::jsonb),
  ('stats', 'happy_buyers', '{"label": "Buyers helped", "value": 850, "suffix": "+"}'::jsonb),
  ('stats', 'supported_games', '{"label": "Popular games", "value": 8, "suffix": "+"}'::jsonb),
  ('stats', 'service_years', '{"label": "Years experience", "value": 3, "suffix": "+"}'::jsonb),

  ('why', 'heading', '"Why Kireiku"'::jsonb),
  ('why', 'subheadline', '"A safer boost lobby built around clear communication, focused execution, and consistent support."'::jsonb),
  ('why', 'cards', '[
    {
      "title": "Clear Process",
      "description": "Every order is directed with organized service information, estimates, and communication."
    },
    {
      "title": "Curated Team",
      "description": "Work is handled by boosters following Kireiku''s operational standards."
    },
    {
      "title": "Security Focus",
      "description": "Account instructions and progress are handled carefully according to each game''s needs."
    },
    {
      "title": "Responsive Support",
      "description": "The Kireiku team keeps communication neat so buyers know the progress and next steps."
    }
  ]'::jsonb),

  ('how_it_works', 'eyebrow', '"How It Works"'::jsonb),
  ('how_it_works', 'heading', '"A simple path from request to completed progress."'::jsonb),
  ('how_it_works', 'subheadline', '"The order flow stays lightweight, predictable, and easy to follow."'::jsonb),
  ('how_it_works', 'steps', '[
    {
      "title": "Choose a Service",
      "description": "The buyer selects the game, boosting type, and desired progress target."
    },
    {
      "title": "Confirm Details",
      "description": "The Kireiku team confirms the scope, estimates, and order requirements before starting."
    },
    {
      "title": "Monitor Progress",
      "description": "Orders are processed gradually with neat updates until the target is complete."
    }
  ]'::jsonb),

  ('footer', 'brand_summary', '"Kireiku is a game boosting service prioritizing neat processes, clear communication, and a comfortable buyer experience."'::jsonb),
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
  ('footer', 'copyright', '"© 2026 Kireiku. All rights reserved. Powered by Mualif Candra @mual.alif"'::jsonb)
on conflict (section, content_key) do nothing;

insert into public.faq_items (id, question, answer, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'What services are available at Kireiku?',
    'Kireiku provides services such as rank boost, quest completion, account leveling, and custom requests matching supported games.',
    10
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'How does the order process start?',
    'The buyer selects a service, sends request details, and the Kireiku team confirms the scope and estimate before work begins.',
    20
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'Can order progress be monitored?',
    'Yes. The Kireiku team will provide progress updates according to the agreed communication channel for each order.',
    30
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    'Is the buyer''s account safe?',
    'Kireiku prioritizes a careful process and only requests information necessary to complete the service.',
    40
  )
on conflict (id) do nothing;

insert into public.services (id, game_name, service_type, description, icon_url, image_url, is_active, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000201',
    'Mobile Legends',
    'Rank Boost',
    'Gradual rank push assistance with experienced boosters and an organized process.',
    null,
    null,
    true,
    10
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'Valorant',
    'Rank Boost',
    'Rank enhancement service with detailed target coordination and completion estimates.',
    null,
    null,
    true,
    20
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    'Genshin Impact',
    'Quest Completion',
    'Quest completion, exploration, and account progress assistance tailored to buyer needs.',
    null,
    null,
    true,
    30
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    'Custom Request',
    'Custom',
    'Discuss special requirements for games or progress targets that are not yet listed.',
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
    'Placeholder testimonial for local/dev needs. Replace with verified testimonials before displaying.',
    null,
    false,
    10
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'Sample Buyer B',
    'Valorant',
    5,
    'Placeholder testimonial that is deliberately hidden from the public by default.',
    null,
    false,
    20
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    'Sample Buyer C',
    'Genshin Impact',
    4,
    'Placeholder testimonial to validate the CMS and query ordering in the local environment.',
    null,
    false,
    30
  )
on conflict (id) do nothing;
