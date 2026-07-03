-- UAT Hotfix 11: Optimized covering/composite indexes for cron execution and tracker joins

-- 1. Create composite/covering index on worker_profiles to optimize joins and filters
CREATE INDEX IF NOT EXISTS worker_profiles_show_card_user_id_cov_idx 
ON public.worker_profiles(show_card, user_id);

-- 2. Create composite/covering index on worker_status to speed up status matching
CREATE INDEX IF NOT EXISTS worker_status_user_status_alpha_cov_idx 
ON public.worker_status(user_id, current_status, alpha_done);

-- 3. Create index on worker_profiles is_flexible column
CREATE INDEX IF NOT EXISTS worker_profiles_is_flexible_idx 
ON public.worker_profiles(is_flexible);

NOTIFY pgrst, 'reload schema';
