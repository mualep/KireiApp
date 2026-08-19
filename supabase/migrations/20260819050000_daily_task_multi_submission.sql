-- Migration: Remove Unique Constraint on daily_tasks(user_id, task_date)
-- Allows workers to submit multiple daily task reports per day.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'daily_tasks'
      AND constraint_type = 'UNIQUE'
  LOOP
    EXECUTE format('ALTER TABLE public.daily_tasks DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.daily_tasks_user_id_task_date_key;
DROP INDEX IF EXISTS public.daily_tasks_user_task_date_unique;
