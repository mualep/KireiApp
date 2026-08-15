-- Sprint 1: Performance, Retention, and Zero-Error-Log RPC Exception Handlers

-- 1. Refactor public.apply_tracker_action RPC wrapper to catch PL/pgSQL exceptions
--    and return a clean JSON result payload with 'ok': false instead of throwing a raw SQL exception.
--    This eliminates 40001/50000 log storms in Supabase Observability.

CREATE OR REPLACE FUNCTION public.apply_tracker_action(
  p_target_user_id uuid,
  p_action text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_actor_tier text;
  v_res jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'unauthenticated',
      'message', 'User is unauthenticated'
    );
  END IF;

  SELECT u.tier
    INTO v_actor_tier
  FROM public.users AS u
  WHERE u.id = v_actor_id
    AND u.is_deleted = false
    AND u.tier IN ('owner', 'admin')
  LIMIT 1;

  IF v_actor_tier IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'unauthorized',
      'message', 'User is not authorized for tracker actions'
    );
  END IF;

  BEGIN
    v_res := app_private.apply_tracker_action_impl(
      v_actor_id,
      p_target_user_id,
      p_action,
      p_expected_version,
      pg_catalog.clock_timestamp()
    );
    RETURN v_res;
  EXCEPTION
    WHEN sqlstate '40001' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'version_conflict',
        'message', 'Tracker version conflict. The card was updated by another process.'
      );
    WHEN sqlstate '42501' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'unauthorized',
        'message', 'Tracker action unauthorized.'
      );
    WHEN sqlstate '22023' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'invalid_input',
        'message', sqlerrm
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'generic_error',
        'message', sqlerrm
      );
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_tracker_action(uuid, text, bigint) FROM public;
REVOKE EXECUTE ON FUNCTION public.apply_tracker_action(uuid, text, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_tracker_action(uuid, text, bigint) TO authenticated;

-- 2. Refactor public.sync_absensi_edit RPC wrapper
CREATE OR REPLACE FUNCTION public.sync_absensi_edit(
  p_target_user_id uuid,
  p_date date,
  p_status text,
  p_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res jsonb;
BEGIN
  BEGIN
    v_res := app_private.sync_absensi_edit_impl(
      (SELECT auth.uid()),
      p_target_user_id,
      p_date,
      p_status,
      p_notes,
      pg_catalog.clock_timestamp()
    );
    RETURN v_res;
  EXCEPTION
    WHEN sqlstate '23514' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'cuti_stock_exhausted',
        'message', 'Stok cuti worker sudah habis.'
      );
    WHEN sqlstate '42501' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'unauthorized',
        'message', 'Tidak memiliki wewenang untuk mengubah absensi.'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'generic_error',
        'message', sqlerrm
      );
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_absensi_edit(uuid, date, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_absensi_edit(uuid, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_absensi_edit(uuid, date, text, text) TO authenticated;

-- 3. Composite Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS worker_attendance_user_date_canceled_idx 
  ON public.worker_attendance (user_id, attendance_date, is_canceled);

CREATE INDEX IF NOT EXISTS worker_records_user_period_idx 
  ON public.worker_records (user_id, period_month);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx 
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS access_logs_created_at_idx 
  ON public.access_logs (created_at DESC);

-- 4. Auto-Pruning Helper Function & Job (Prune logs older than 90 days)
CREATE OR REPLACE FUNCTION app_private.prune_old_audit_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_audit integer := 0;
  v_deleted_access integer := 0;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

  DELETE FROM public.access_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_access = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_audit_logs', v_deleted_audit,
    'deleted_access_logs', v_deleted_access
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION app_private.prune_old_audit_logs() FROM public;
REVOKE EXECUTE ON FUNCTION app_private.prune_old_audit_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION app_private.prune_old_audit_logs() FROM authenticated;

-- Schedule pg_cron retention job if pg_cron extension is active
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'prune-old-audit-logs',
      '0 3 * * 0', -- Run at 03:00 AM UTC every Sunday
      'SELECT app_private.prune_old_audit_logs()'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if pg_cron is not enabled on this environment
    NULL;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
