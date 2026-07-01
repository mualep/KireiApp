-- UAT Hotfix 7: Database Performance Indexing & Reset Records Constraint Fix

-- 1. Create B-Tree indexes for performance optimization
CREATE INDEX IF NOT EXISTS worker_profiles_show_card_idx ON public.worker_profiles(show_card);
CREATE INDEX IF NOT EXISTS worker_status_current_status_idx ON public.worker_status(current_status);
CREATE INDEX IF NOT EXISTS worker_status_alpha_done_idx ON public.worker_status(alpha_done);
CREATE INDEX IF NOT EXISTS worker_attendance_attendance_date_idx ON public.worker_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS worker_records_period_month_idx ON public.worker_records(period_month);

-- 2. Drop and recreate last_source check constraint on worker_records to support 'manual' source
ALTER TABLE public.worker_records DROP CONSTRAINT IF EXISTS worker_records_last_source_check;
ALTER TABLE public.worker_records ADD CONSTRAINT worker_records_last_source_check CHECK (
  last_source IS NULL OR last_source IN ('tracker', 'absensi', 'cron', 'system', 'manual')
);

-- 3. Redefine reset_records RPC to use 'manual' and 'manual.reset_records'
CREATE OR REPLACE FUNCTION public.reset_records(
  p_period_month date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_actor_tier text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'records.unauthenticated' USING errcode = '42501';
  END IF;

  SELECT u.tier
    INTO v_actor_tier
  FROM public.users AS u
  WHERE u.id = v_actor_id
    AND u.is_deleted = false
    AND u.tier = 'owner'
  LIMIT 1;

  IF v_actor_tier IS NULL THEN
    RAISE EXCEPTION 'records.unauthorized' USING errcode = '42501';
  END IF;

  IF p_period_month IS NULL THEN
    RAISE EXCEPTION 'records.invalid_input' USING errcode = '22023';
  END IF;

  -- Reset all record stats for the given month, leaving cuti_stock_snapshot intact
  UPDATE public.worker_records
  SET
    work_late_seconds = 0,
    break_late_seconds = 0,
    alpha_count = 0,
    sakit_days = 0,
    pending_days = 0,
    lembur_units = 0,
    work_late_override_seconds = null,
    break_late_override_seconds = null,
    alpha_override_count = null,
    sakit_override_days = null,
    pending_override_days = null,
    lembur_override_units = null,
    cuti_stock_override_snapshot = null,
    last_source = 'manual',
    last_source_action = 'manual.reset_records',
    updated_at = pg_catalog.clock_timestamp()
  WHERE period_month = p_period_month;

  -- Log audit record
  PERFORM app_private.write_audit_log(
    'records',
    'records.reset',
    'worker_records',
    p_period_month::text,
    pg_catalog.jsonb_build_object(
      'action', 'records.reset',
      'period_month', p_period_month,
      'actor_id', v_actor_id
    ),
    null
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_records(date) FROM public;
REVOKE EXECUTE ON FUNCTION public.reset_records(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_records(date) TO authenticated;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
