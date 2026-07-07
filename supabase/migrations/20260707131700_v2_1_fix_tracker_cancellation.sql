-- Migration: Recreate apply_tracker_correction_impl to support absensi-sourced corrections
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
  v_shift_start_hour smallint;
  v_shift_start_min smallint;
  v_shift_end_hour smallint;
  v_shift_end_min smallint;
  v_is_flexible boolean;
  v_shift_end_date date;
  v_shift_ends_at timestamptz;
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

  -- CRITICAL ENHANCEMENT: Allow either source = 'tracker' + v_expected_source_action OR source = 'absensi' + 'absensi.correct_' || v_expected_status
  IF NOT found
    OR v_attendance_is_canceled
    OR v_attendance_status <> v_expected_status
    OR (
      (v_attendance_source <> 'tracker' OR v_attendance_source_action <> v_expected_source_action)
      AND
      (v_attendance_source <> 'absensi' OR v_attendance_source_action <> 'absensi.correct_' || v_expected_status)
    )
  THEN
    RAISE EXCEPTION 'tracker.attendance_missing' USING errcode = '22023';
  END IF;

  v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;

  SELECT
    wp.shift_start_hour,
    wp.shift_start_min,
    wp.shift_end_hour,
    wp.shift_end_min,
    wp.is_flexible
    INTO
      v_shift_start_hour,
      v_shift_start_min,
      v_shift_end_hour,
      v_shift_end_min,
      v_is_flexible
  FROM public.worker_profiles as wp
  WHERE wp.user_id = p_target_user_id;

  IF NOT found THEN
    RAISE EXCEPTION 'tracker.invalid_target' USING errcode = '22023';
  END IF;

  IF v_is_flexible THEN
    IF (p_now AT TIME ZONE 'Asia/Jakarta')::date <> v_attendance_date THEN
      RAISE EXCEPTION 'tracker.correction_expired' USING errcode = '22023';
    END IF;
  ELSE
    IF v_shift_start_hour IS NULL
      OR v_shift_start_min IS NULL
      OR v_shift_end_hour IS NULL
      OR v_shift_end_min IS NULL
    THEN
      RAISE EXCEPTION 'tracker.invalid_target' USING errcode = '22023';
    END IF;

    v_shift_end_date := v_attendance_date;

    IF (v_shift_end_hour::integer * 60) + v_shift_end_min::integer
      <= (v_shift_start_hour::integer * 60) + v_shift_start_min::integer
    THEN
      v_shift_end_date := v_attendance_date + 1;
    END IF;

    v_shift_ends_at := pg_catalog.make_timestamptz(
      pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
      pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
      pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
      v_shift_end_hour::integer,
      v_shift_end_min::integer,
      0,
      'Asia/Jakarta'
    );

    IF p_now >= v_shift_ends_at THEN
      RAISE EXCEPTION 'tracker.correction_expired' USING errcode = '22023';
    END IF;
  END IF;

  IF v_action = 'CANCEL_CUTI' THEN
    SELECT wp.cuti_stock
      INTO v_cuti_stock_before
    FROM public.worker_profiles as wp
    WHERE wp.user_id = p_target_user_id
    FOR UPDATE;

    IF NOT found THEN
      RAISE EXCEPTION 'tracker.invalid_target' USING errcode = '22023';
    END IF;

    UPDATE public.worker_profiles as wp
    SET cuti_stock = wp.cuti_stock + 1
    WHERE wp.user_id = p_target_user_id
    RETURNING wp.cuti_stock INTO v_cuti_stock_after;

    v_cuti_stock_delta := 1;

    UPDATE public.worker_records as wr
    SET
      cuti_stock_snapshot = v_cuti_stock_after,
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_cuti',
      updated_at = p_now
    WHERE wr.user_id = p_target_user_id
      AND wr.period_month = v_period_month;
  ELSIF v_action = 'CANCEL_SAKIT' THEN
    v_sakit_days_delta := -1;

    UPDATE public.worker_records as wr
    SET
      sakit_days = wr.sakit_days - 1,
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_sakit',
      updated_at = p_now
    WHERE wr.user_id = p_target_user_id
      AND wr.period_month = v_period_month
      AND wr.sakit_days > 0;
  ELSE
    v_pending_days_delta := -1;

    UPDATE public.worker_records as wr
    SET
      pending_days = wr.pending_days - 1,
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_izin',
      updated_at = p_now
    WHERE wr.user_id = p_target_user_id
      AND wr.period_month = v_period_month
      AND wr.pending_days > 0;
  END IF;

  IF NOT found THEN
    RAISE EXCEPTION 'tracker.records_missing' USING errcode = '22023';
  END IF;

  UPDATE public.worker_attendance as wa
  SET
    is_canceled = true,
    updated_at = p_now
  WHERE wa.id = p_attendance_id;

  UPDATE public.worker_status as ws
  SET
    current_status = 'off',
    version = v_from_version + 1,
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
    break_late_recorded = false,
    sakit_started_at = null,
    pending_started_at = null,
    cuti_set_date = null,
    lembur_started_at = null
  WHERE ws.user_id = p_target_user_id;

  INSERT INTO public.worker_attendance_corrections (
    attendance_id,
    target_user_id,
    actor_user_id,
    attendance_date,
    correction_action,
    before_status,
    before_source,
    before_source_action,
    pending_days_delta,
    sakit_days_delta,
    cuti_stock_delta,
    cuti_stock_before,
    cuti_stock_after,
    reason,
    created_at
  )
  VALUES (
    p_attendance_id,
    p_target_user_id,
    p_actor_user_id,
    v_attendance_date,
    v_action,
    v_attendance_status,
    v_attendance_source,
    v_attendance_source_action,
    v_pending_days_delta,
    v_sakit_days_delta,
    v_cuti_stock_delta,
    v_cuti_stock_before,
    v_cuti_stock_after,
    v_reason,
    p_now
  )
  RETURNING id INTO v_correction_id;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    CASE v_action
      WHEN 'CANCEL_CUTI' THEN 'tracker.cancel_cuti'
      WHEN 'CANCEL_SAKIT' THEN 'tracker.cancel_sakit'
      WHEN 'CANCEL_IZIN' THEN 'tracker.cancel_izin'
    END,
    'worker_attendance',
    p_attendance_id::text,
    pg_catalog.jsonb_build_object(
      'correction_id', v_correction_id,
      'correction_action', v_action,
      'attendance_id', p_attendance_id,
      'target_user_id', p_target_user_id,
      'attendance_date', v_attendance_date,
      'from_status', v_from_status,
      'to_status', 'off',
      'from_version', v_from_version,
      'to_version', v_from_version + 1,
      'pending_days_delta', v_pending_days_delta,
      'sakit_days_delta', v_sakit_days_delta,
      'cuti_stock_delta', v_cuti_stock_delta,
      'cuti_stock_after', v_cuti_stock_after,
      'reason', v_reason
    ),
    p_target_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'action', v_action,
    'audit_id', v_audit_id,
    'correction_id', v_correction_id,
    'target_user_id', p_target_user_id,
    'attendance_id', p_attendance_id,
    'from_status', v_from_status,
    'to_status', 'off',
    'from_version', v_from_version,
    'to_version', v_from_version + 1
  );
END;
$$;
