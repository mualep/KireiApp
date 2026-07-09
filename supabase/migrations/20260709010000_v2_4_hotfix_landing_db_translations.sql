-- Migration: Phase V2-4 Hotfix Landing Page Database Translations
-- Overwrites old Indonesian content in landing_content, faq_items, and services tables with proper English translations

-- 1. Update landing_content values for stats, why, howItWorks, and footer
UPDATE public.landing_content
SET content_value = '{"label": "Completed orders", "value": 1200, "suffix": "+"}'::jsonb
WHERE section = 'stats' AND content_key = 'orders_completed';

UPDATE public.landing_content
SET content_value = '{"label": "Buyers helped", "value": 850, "suffix": "+"}'::jsonb
WHERE section = 'stats' AND content_key = 'happy_buyers';

UPDATE public.landing_content
SET content_value = '{"label": "Popular games", "value": 8, "suffix": "+"}'::jsonb
WHERE section = 'stats' AND content_key = 'supported_games';

UPDATE public.landing_content
SET content_value = '{"label": "Years experience", "value": 3, "suffix": "+"}'::jsonb
WHERE section = 'stats' AND content_key = 'service_years';

UPDATE public.landing_content
SET content_value = '[
  {"title": "Clear Process", "description": "Every order is directed with organized service information, estimates, and communication."},
  {"title": "Curated Team", "description": "Work is handled by boosters following Kireiku''s operational standards."},
  {"title": "Security Focus", "description": "Account instructions and progress are handled carefully according to each game''s needs."},
  {"title": "Responsive Support", "description": "The Kireiku team keeps communication neat so buyers know the progress and next steps."}
]'::jsonb
WHERE section = 'why' AND content_key = 'cards';

UPDATE public.landing_content
SET content_value = '[
  {"title": "Choose a Service", "description": "The buyer selects the game, boosting type, and desired progress target."},
  {"title": "Confirm Details", "description": "The Kireiku team confirms the scope, estimates, and order requirements before starting."},
  {"title": "Monitor Progress", "description": "Orders are processed gradually with neat updates until the target is complete."}
]'::jsonb
WHERE section = 'how_it_works' AND content_key = 'steps';

UPDATE public.landing_content
SET content_value = '"Kireiku is a game boosting service prioritizing neat processes, clear communication, and a comfortable buyer experience."'::jsonb
WHERE section = 'footer' AND content_key = 'brand_summary';

UPDATE public.landing_content
SET content_value = '"© 2026 Kireiku. All rights reserved. Powered by Mualif Candra @mual.alif"'::jsonb
WHERE section = 'footer' AND content_key = 'copyright';


-- 2. Update faq_items question & answer translations
UPDATE public.faq_items
SET question = 'What services are available at Kireiku?',
    answer = 'Kireiku provides services such as rank boost, quest completion, account leveling, and custom requests matching supported games.'
WHERE id = '00000000-0000-4000-8000-000000000101' OR question = 'Layanan apa saja yang tersedia di Kireiku?';

UPDATE public.faq_items
SET question = 'How does the order process start?',
    answer = 'The buyer selects a service, sends request details, and the Kireiku team confirms the scope and estimate before work begins.'
WHERE id = '00000000-0000-4000-8000-000000000102' OR question = 'Bagaimana proses order dimulai?';

UPDATE public.faq_items
SET question = 'Can order progress be monitored?',
    answer = 'Yes. The Kireiku team will provide progress updates according to the agreed communication channel for each order.'
WHERE id = '00000000-0000-4000-8000-000000000103' OR question = 'Apakah progres order bisa dipantau?';

UPDATE public.faq_items
SET question = 'Is the buyer''s account safe?',
    answer = 'Kireiku prioritizes a careful process and only requests information necessary to complete the service.'
WHERE id = '00000000-0000-4000-8000-000000000104' OR question = 'Apakah akun buyer aman?';


-- 3. Update services description translations
UPDATE public.services
SET description = 'Gradual rank push assistance with experienced boosters and an organized process.'
WHERE id = '00000000-0000-4000-8000-000000000201' OR (game_name = 'Mobile Legends' AND service_type = 'Rank Boost');

UPDATE public.services
SET description = 'Rank enhancement service with detailed target coordination and completion estimates.'
WHERE id = '00000000-0000-4000-8000-000000000202' OR (game_name = 'Valorant' AND service_type = 'Rank Boost');

UPDATE public.services
SET description = 'Quest completion, exploration, and account progress assistance tailored to buyer needs.'
WHERE id = '00000000-0000-4000-8000-000000000203' OR (game_name = 'Genshin Impact' AND service_type = 'Quest Completion');

UPDATE public.services
SET description = 'Discuss special requirements for games or progress targets that are not yet listed.'
WHERE id = '00000000-0000-4000-8000-000000000204' OR (game_name = 'Custom Request' AND service_type = 'Custom');


-- 4. Update testimonials comment translations
UPDATE public.testimonials
SET comment = 'Placeholder testimonial for local/dev needs. Replace with verified testimonials before displaying.'
WHERE id = '00000000-0000-4000-8000-000000000301';

UPDATE public.testimonials
SET comment = 'Placeholder testimonial that is deliberately hidden from the public by default.'
WHERE id = '00000000-0000-4000-8000-000000000302';

UPDATE public.testimonials
SET comment = 'Placeholder testimonial to validate the CMS and query ordering in the local environment.'
WHERE id = '00000000-0000-4000-8000-000000000303';
