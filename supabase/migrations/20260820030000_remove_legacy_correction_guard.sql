-- Migration: Remove legacy time-boundary expiration guard for tracker corrections
-- Allows historical rollbacks of CUTI, SAKIT, PENDING directly from Tracker UI

CREATE OR REPLACE FUNCTION app_private.apply_tracker_correction_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_correction_action text,
  p_expected_version bigint,
  p_attendance_id uuid,
  p_reason text,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_tier text;
  v_action text := nullif(pg_catalog.btrim(p_correction_action), '');
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_from_status text;
  v_from_version bigint;
  v_expected_status text;
  v_expected_source_action text;
  v_attendance_date date;
  v_attendance_status text;
  v_attendance_source text;
  v_attendance_source_action text;
  v_attendance_is_canceled boolean;
  v_period_month date;
  v_pending_days_delta integer := 0;
  v_sakit_days_delta integer := 0;
  v_cuti_stock_delta integer := 0;
  v_cuti_stock_before smallint;
  v_cuti_stock_after smallint;
  v_correction_id uuid;
  v_audit_id uuid;
BEGIN
  SELECT u.tier
    INTO v_actor_tier
  FROM public.users as u
  WHERE u.id = p_actor_user_id
    AND u.is_deleted = false
    AND u.tier IN ('owner', 'admin')
  LIMIT 1;

  IF v_actor_tier IS NULL THEN
    RAISE EXCEPTION 'tracker.unauthorized' USING errcode = '42501';
  END IF;

  IF v_action NOT IN ('CANCEL_CUTI', 'CANCEL_SAKIT', 'CANCEL_IZIN') THEN
    RAISE EXCEPTION 'tracker.invalid_correction_action' USING errcode = '22023';
  END IF;

  IF p_target_user_id IS NULL
    OR p_attendance_id IS NULL
    OR p_now IS NULL
    OR p_expected_version IS NULL
    OR p_expected_version < 0
    OR v_reason IS NULL
    OR pg_catalog.char_length(v_reason) > 500
  THEN
    RAISE EXCEPTION 'tracker.invalid_correction_input' USING errcode = '22023';
  END IF;

  SELECT
    CASE v_action
      WHEN 'CANCEL_CUTI' THEN 'cuti'
      WHEN 'CANCEL_SAKIT' THEN 'sakit'
      WHEN 'CANCEL_IZIN' THEN 'pending'
    END,
    CASE v_action
      WHEN 'CANCEL_CUTI' THEN 'tracker.cuti'
      WHEN 'CANCEL_SAKIT' THEN 'tracker.sakit'
      WHEN 'CANCEL_IZIN' THEN 'tracker.izin'
    END
    INTO v_expected_status, v_expected_source_action;

  SELECT ws.current_status, ws.version
    INTO v_from_status, v_from_version
  FROM public.worker_status as ws
  WHERE ws.user_id = p_target_user_id
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'tracker.invalid_target' USING errcode = '22023';
  END IF;

  IF v_from_version <> p_expected_version then
    RAISE EXCEPTION 'tracker.version_conflict' USING errcode = '40001';
  END IF;

  IF v_from_status <> v_expected_status then
    RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
  END IF;

  SELECT
    wa.attendance_date,
    wa.status,
    wa.source,
    wa.source_action,
    wa.is_canceled
    INTO
      v_attendance_date,
      v_attendance_status,
      v_attendance_source,
      v_attendance_source_action,
      v_attendance_is_canceled
  FROM public.worker_attendance as wa
  WHERE wa.id = p_attendance_id
    AND wa.user_id = p_target_user_id
  FOR UPDATE;

  -- Allow source = 'tracker' + v_expected_source_action OR source = 'absensi' + 'absensi.correct_' || v_expected_status OR source_action = 'apply_scheduled'
  IF NOT found
    OR v_attendance_is_canceled
    OR v_attendance_status <> v_expected_status
    OR (
      (v_attendance_source <> 'tracker' OR v_attendance_source_action <> v_expected_source_action)
      AND
      (v_attendance_source <> 'absensi' OR v_attendance_source_action <> 'absensi.correct_' || v_expected_status)
      AND
      (v_attendance_source_action <> 'apply_scheduled')
    )
  THEN
    RAISE EXCEPTION 'tracker.attendance_missing' USING errcode = '22023';
  END IF;

  v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;

  IF v_action = 'CANCEL_CUTI' THEN
    v_cuti_stock_delta := 1;
  ELSIF v_action = 'CANCEL_SAKIT' THEN
    v_sakit_days_delta := -1;
  ELSIF v_action = 'CANCEL_IZIN' THEN
    v_pending_days_delta := -1;
  END IF;

  SELECT wp.cuti_stock
    INTO v_cuti_stock_before
  FROM public.worker_profiles as wp
  WHERE wp.user_id = p_target_user_id;

  v_cuti_stock_after := coalesce(v_cuti_stock_before, 0) + v_cuti_stock_delta;

  IF v_action = 'CANCEL_CUTI' THEN
    UPDATE public.worker_profiles
    SET cuti_stock = v_cuti_stock_after
    WHERE user_id = p_target_user_id;
  END IF;

  UPDATE public.worker_attendance
  SET is_canceled = true,
      updated_at = p_now
  WHERE id = p_attendance_id;

  INSERT INTO public.worker_records (
    user_id,
    period_month,
    work_late_seconds,
    work_late_delta,
    break_late_seconds,
    break_late_delta,
    alpha_count,
    alpha_delta,
    sakit_days,
    sakit_delta,
    pending_days,
    pending_delta,
    lembur_units,
    lembur_delta,
    cuti_stock_snapshot,
    cuti_stock_delta,
    last_source,
    last_source_action,
    created_at,
    updated_at
  ) VALUES (
    p_target_user_id,
    v_period_month,
    0, 0, 0, 0, 0, 0,
    greatest(v_sakit_days_delta, 0),
    v_sakit_days_delta,
    greatest(v_pending_days_delta, 0),
    v_pending_days_delta,
    0, 0,
    v_cuti_stock_after,
    v_cuti_stock_delta,
    'tracker',
    v_action,
    p_now,
    p_now
  )
  ON CONFLICT (user_id, period_month) DO UPDATE
  SET sakit_days = greatest(public.worker_records.sakit_days + excluded.sakit_delta, 0),
      sakit_delta = public.worker_records.sakit_delta + excluded.sakit_delta,
      pending_days = greatest(public.worker_records.pending_days + excluded.pending_delta, 0),
      pending_delta = public.worker_records.pending_delta + excluded.pending_delta,
      cuti_stock_snapshot = excluded.cuti_stock_snapshot,
      cuti_stock_delta = public.worker_records.cuti_stock_delta + excluded.cuti_stock_delta,
      last_source = excluded.last_source,
      last_source_action = excluded.last_source_action,
      updated_at = excluded.updated_at;

  UPDATE public.worker_status
  SET current_status = 'off',
      version = v_from_version + 1,
      cuti_set_date = null,
      sakit_started_at = null,
      pending_started_at = null,
      shift_active_date = null,
      shift_active_started_at = null,
      shift_active_label = null,
      shift_active_start_hour = null,
      shift_active_start_min = null,
      shift_active_end_hour = null,
      shift_active_end_min = null,
      break_started_at = null,
      break_timer_running = false,
      break_accumulated_secs = 0,
      break_late_recorded = false
  WHERE user_id = p_target_user_id;

  INSERT INTO public.audit_logs (
    actor_user_id,
    target_user_id,
    domain,
    action,
    payload_json,
    created_at
  ) VALUES (
    p_actor_user_id,
    p_target_user_id,
    'tracker',
    'tracker.correction',
    jsonb_build_object(
      'correction_action', v_action,
      'attendance_id', p_attendance_id,
      'reason', v_reason
    ),
    p_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'from_status', v_from_status,
    'to_status', 'off',
    'version', v_from_version + 1
  );
END;
$$;
