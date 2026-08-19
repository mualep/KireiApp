-- Migration: Patch cron_apply_scheduled_attendance and apply_tracker_correction_impl
-- 1. Set cuti_set_date, sakit_started_at, pending_started_at in cron_apply_scheduled_attendance
-- 2. Allow 'apply_scheduled' source_action in app_private.apply_tracker_correction_impl

CREATE OR REPLACE FUNCTION public.cron_apply_scheduled_attendance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_wib date;
  v_applied_count integer := 0;
  rec record;
  v_existing_attendance record;
BEGIN
  -- 1. Determine current date in WIB (Asia/Jakarta)
  v_today_wib := (now() AT TIME ZONE 'Asia/Jakarta')::date;

  -- 2. Loop through all active scheduled_attendance records where target_date <= v_today_wib
  FOR rec IN
    SELECT id, user_id, target_date, status, notes
    FROM public.scheduled_attendance
    WHERE target_date <= v_today_wib
      AND applied_at IS NULL
      AND cancelled_at IS NULL
    ORDER BY target_date ASC, created_at ASC
  LOOP
    -- 3. Double-apply Guard: check if worker_attendance row already exists for user_id and target_date
    SELECT id INTO v_existing_attendance
    FROM public.worker_attendance
    WHERE user_id = rec.user_id
      AND attendance_date = rec.target_date
      AND is_canceled = false;

    IF FOUND THEN
      -- Worker already has an active attendance entry (e.g. checked in manual first).
      -- Just mark the scheduled_attendance as applied to prevent overwriting/double-applying.
      UPDATE public.scheduled_attendance
      SET applied_at = now(),
          updated_at = now()
      WHERE id = rec.id;
    ELSE
      -- Insert into worker_attendance
      INSERT INTO public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      ) VALUES (
        rec.user_id,
        rec.target_date,
        rec.status,
        'cron',
        'apply_scheduled',
        now(),
        now()
      )
      ON CONFLICT (user_id, attendance_date) DO UPDATE
      SET status = EXCLUDED.status,
          source = EXCLUDED.source,
          source_action = EXCLUDED.source_action,
          updated_at = now();

      -- Update worker_status for the user to reflect current scheduled status & set marker dates
      UPDATE public.worker_status
      SET current_status = rec.status,
          cuti_set_date = CASE WHEN rec.status = 'cuti' THEN rec.target_date ELSE null END,
          sakit_started_at = CASE WHEN rec.status = 'sakit' THEN now() ELSE null END,
          pending_started_at = CASE WHEN rec.status = 'pending' THEN now() ELSE null END,
          updated_at = now()
      WHERE user_id = rec.user_id;

      -- Recalculate monthly summary if app_private function exists
      BEGIN
        PERFORM app_private.recalculate_worker_records(rec.user_id, rec.target_date);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      -- Audit Log
      INSERT INTO public.audit_logs (
        actor_user_id,
        target_user_id,
        domain,
        action,
        payload_json,
        created_at
      ) VALUES (
        NULL,
        rec.user_id,
        'absensi',
        'cron.apply_scheduled',
        jsonb_build_object(
          'schedule_id', rec.id,
          'status', rec.status,
          'target_date', rec.target_date,
          'notes', rec.notes
        ),
        now()
      );

      -- Mark schedule as applied
      UPDATE public.scheduled_attendance
      SET applied_at = now(),
          updated_at = now()
      WHERE id = rec.id;

      v_applied_count := v_applied_count + 1;
    END IF;
  END LOOP;

  RETURN v_applied_count;
END;
$$;

-- Also update app_private.apply_tracker_correction_impl to support 'apply_scheduled' source_action
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
