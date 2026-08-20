-- Migration: Hotfix Batch 10 - Restore Safe Audit Logging Helper & System Source in RPCs
-- 1. Redefine app_private.apply_tracker_action_impl using app_private.write_audit_log
CREATE OR REPLACE FUNCTION app_private.apply_tracker_action_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_expected_version bigint,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text := nullif(pg_catalog.btrim(p_action), '');
  v_actor_tier text;
  v_target_exists boolean;
  v_from_status text;
  v_to_status text;
  v_from_version bigint;
  v_to_version bigint;
  v_alpha_done boolean;
  v_shift_active_date date;
  v_shift_active_started_at timestamptz;
  v_break_started_at timestamptz;
  v_break_timer_running boolean;
  v_break_accumulated_secs integer;
  v_break_accumulated_secs_before integer;
  v_break_late_recorded boolean;
  v_shift_label text;
  v_gid text := null;
  v_shift_start_hour smallint;
  v_shift_start_min smallint;
  v_shift_end_hour smallint;
  v_shift_end_min smallint;
  v_is_flexible boolean;
  v_wib_timestamp timestamp;
  v_wib_date date;
  v_attendance_date date;
  v_period_month date;
  v_shift_end_date date;
  v_current_wib_minutes integer;
  v_shift_start_minutes integer;
  v_shift_end_minutes integer;
  v_shift_starts_at timestamptz;
  v_shift_ends_at timestamptz;
  v_grace_at timestamptz;
  v_display_status_before text;
  v_work_late_seconds_delta integer := 0;
  v_record_break_late_seconds integer := 0;
  v_attendance_status text;
  v_source_action text;
  v_attendance_id uuid;
  v_existing_attendance_status text;
  v_existing_attendance_canceled boolean;
  v_attendance_reused boolean := false;
  v_cuti_stock_before smallint;
  v_cuti_stock_after smallint;
  v_record_work_late_seconds integer := 0;
  v_record_pending_days integer := 0;
  v_record_sakit_days integer := 0;
  v_record_cuti_stock_snapshot smallint;
  v_audit_action text;
  v_audit_id uuid;
  v_record_deltas jsonb := '{}'::jsonb;
  v_cuti_stock_delta integer := 0;
  v_cuti_stock_delta_recorded integer := 0;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'tracker.unauthenticated' USING errcode = '42501';
  END IF;

  SELECT u.tier
    INTO v_actor_tier
  FROM public.users AS u
  WHERE u.id = p_actor_user_id
    AND u.is_deleted = false
    AND u.tier IN ('owner', 'admin')
  LIMIT 1;

  IF v_actor_tier IS NULL THEN
    RAISE EXCEPTION 'tracker.unauthorized' USING errcode = '42501';
  END IF;

  IF v_action IS NULL OR v_action NOT IN (
    'START',
    'ISTIRAHAT',
    'LANJUT',
    'SELESAI',
    'CUTI',
    'IZIN',
    'SAKIT',
    'CANCEL_START'
  ) THEN
    RAISE EXCEPTION 'tracker.invalid_action' USING errcode = '22023';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'tracker.target_not_found' USING errcode = 'P0002';
  END IF;

  SELECT
    wp.shift,
    wp.shift_start_hour,
    wp.shift_start_min,
    wp.shift_end_hour,
    wp.shift_end_min,
    wp.is_flexible,
    wp.cuti_stock,
    ws.current_status,
    ws.version,
    ws.alpha_done,
    ws.shift_active_date,
    ws.shift_active_started_at,
    ws.break_started_at,
    ws.break_timer_running,
    ws.break_accumulated_secs,
    ws.break_late_recorded
  INTO
    v_shift_label,
    v_shift_start_hour,
    v_shift_start_min,
    v_shift_end_hour,
    v_shift_end_min,
    v_is_flexible,
    v_cuti_stock_before,
    v_from_status,
    v_from_version,
    v_alpha_done,
    v_shift_active_date,
    v_shift_active_started_at,
    v_break_started_at,
    v_break_timer_running,
    v_break_accumulated_secs,
    v_break_late_recorded
  FROM public.worker_profiles AS wp
  JOIN public.worker_status AS ws ON ws.user_id = wp.user_id
  WHERE wp.user_id = p_target_user_id
    AND wp.show_card = true
  FOR UPDATE OF ws;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tracker.target_not_found' USING errcode = 'P0002';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version <> v_from_version THEN
    RAISE EXCEPTION 'tracker.version_mismatch' USING errcode = '40001';
  END IF;

  v_wib_timestamp := p_now AT TIME ZONE 'Asia/Jakarta';
  v_wib_date := v_wib_timestamp::date;

  IF v_is_flexible OR v_shift_start_hour IS NULL OR v_shift_start_min IS NULL OR v_shift_end_hour IS NULL OR v_shift_end_min IS NULL THEN
    v_attendance_date := v_wib_date;
  ELSE
    v_current_wib_minutes := (pg_catalog.date_part('hour', v_wib_timestamp)::integer * 60) + pg_catalog.date_part('minute', v_wib_timestamp)::integer;
    v_shift_start_minutes := (v_shift_start_hour * 60) + v_shift_start_min;
    v_shift_end_minutes := (v_shift_end_hour * 60) + v_shift_end_min;

    DECLARE
      v_shift_start_today timestamp;
      v_cycle_date date;
    BEGIN
      v_shift_start_today := pg_catalog.make_timestamp(
        pg_catalog.date_part('year', v_wib_date::timestamp)::integer,
        pg_catalog.date_part('month', v_wib_date::timestamp)::integer,
        pg_catalog.date_part('day', v_wib_date::timestamp)::integer,
        v_shift_start_hour,
        v_shift_start_min,
        0
      );

      -- Robust Shift Cycle Math: If more than 4h before today's shift start, cycle belongs to yesterday
      IF v_wib_timestamp < (v_shift_start_today - interval '4 hours') THEN
        v_cycle_date := v_wib_date - 1;
      ELSE
        v_cycle_date := v_wib_date;
      END IF;

      IF v_shift_start_hour < 6 THEN
        v_attendance_date := v_cycle_date - 1;
      ELSE
        v_attendance_date := v_cycle_date;
      END IF;

      IF v_shift_start_hour = 0 THEN
        v_cycle_date := v_attendance_date + 1;
        v_shift_end_date := v_attendance_date + 1;
      ELSIF v_shift_end_hour < v_shift_start_hour OR (v_shift_end_hour = 0 AND v_shift_start_hour > 0) THEN
        v_cycle_date := v_attendance_date;
        v_shift_end_date := v_attendance_date + 1;
      ELSE
        v_cycle_date := v_attendance_date;
        v_shift_end_date := v_attendance_date;
      END IF;

      v_shift_starts_at := pg_catalog.make_timestamptz(
        pg_catalog.date_part('year', v_cycle_date::timestamp)::integer,
        pg_catalog.date_part('month', v_cycle_date::timestamp)::integer,
        pg_catalog.date_part('day', v_cycle_date::timestamp)::integer,
        v_shift_start_hour,
        v_shift_start_min,
        0,
        'Asia/Jakarta'
      );

      v_shift_ends_at := pg_catalog.make_timestamptz(
        pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
        pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
        pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
        v_shift_end_hour,
        v_shift_end_min,
        0,
        'Asia/Jakarta'
      );

      v_grace_at := v_shift_starts_at + interval '10 minutes';
    END;
  END IF;

  v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;
  v_source_action := 'tracker.' || lower(v_action);
  v_audit_action := v_source_action;

  IF v_action = 'START' THEN
    IF v_from_status <> 'off' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    IF NOT v_is_flexible AND v_grace_at IS NOT NULL AND p_now >= v_grace_at THEN
      v_record_work_late_seconds := CASE
        WHEN pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer > 0
          THEN pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer
        ELSE 0
      END;
    END IF;

    v_attendance_status := 'hadir';

    SELECT wa.id, wa.status, coalesce(wa.is_canceled, false)
      INTO v_attendance_id, v_existing_attendance_status, v_existing_attendance_canceled
    FROM public.worker_attendance AS wa
    WHERE wa.user_id = p_target_user_id
      AND wa.attendance_date = v_attendance_date
    LIMIT 1;

    IF v_attendance_id IS NOT NULL THEN
      UPDATE public.worker_attendance
      SET
        status = v_attendance_status,
        source = 'tracker',
        source_action = v_source_action,
        is_canceled = false,
        updated_at = p_now
      WHERE id = v_attendance_id;
    ELSE
      INSERT INTO public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      )
      VALUES (
        p_target_user_id,
        v_attendance_date,
        v_attendance_status,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      RETURNING id INTO v_attendance_id;
    END IF;

    IF v_record_work_late_seconds > 0 THEN
      INSERT INTO public.worker_records (
        user_id,
        period_month,
        work_late_seconds,
        cuti_stock_delta,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      VALUES (
        p_target_user_id,
        v_period_month,
        v_record_work_late_seconds,
        0,
        'tracker',
        v_audit_action,
        p_now,
        p_now
      )
      ON CONFLICT (user_id, period_month) DO UPDATE
      SET
        work_late_seconds = public.worker_records.work_late_seconds + excluded.work_late_seconds,
        cuti_stock_delta = public.worker_records.cuti_stock_delta + excluded.cuti_stock_delta,
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    END IF;

    UPDATE public.worker_status AS ws
    SET
      current_status = 'on',
      version = v_from_version + 1,
      shift_active_date = v_attendance_date,
      shift_active_started_at = p_now,
      shift_active_label = v_shift_label,
      shift_active_start_hour = v_shift_start_hour,
      shift_active_start_min = v_shift_start_min,
      shift_active_end_hour = v_shift_end_hour,
      shift_active_end_min = v_shift_end_min,
      break_started_at = null,
      break_timer_running = false,
      break_accumulated_secs = 0,
      break_late_recorded = false,
      sakit_started_at = null,
      pending_started_at = null,
      cuti_set_date = null,
      lembur_started_at = null,
      alpha_done = false
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'CANCEL_START' THEN
    IF v_from_status <> 'on' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    IF NOT v_is_flexible AND v_shift_active_started_at IS NOT NULL AND v_grace_at IS NOT NULL THEN
      IF v_shift_active_started_at >= v_grace_at THEN
        v_record_work_late_seconds := CASE
          WHEN pg_catalog.floor(pg_catalog.date_part('epoch', v_shift_active_started_at - v_grace_at))::integer > 0
            THEN pg_catalog.floor(pg_catalog.date_part('epoch', v_shift_active_started_at - v_grace_at))::integer
          ELSE 0
        END;
      END IF;
    END IF;

    IF v_record_work_late_seconds > 0 THEN
      UPDATE public.worker_records
      SET
        work_late_seconds = greatest(work_late_seconds - v_record_work_late_seconds, 0),
        last_source = 'tracker',
        last_source_action = 'tracker.cancel_start',
        updated_at = p_now
      WHERE user_id = p_target_user_id
        AND period_month = v_period_month;
    END IF;

    DELETE FROM public.worker_attendance AS wa
    WHERE wa.user_id = p_target_user_id
      AND wa.attendance_date = coalesce(v_shift_active_date, v_attendance_date);

    UPDATE public.worker_status AS ws
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
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'ISTIRAHAT' THEN
    IF v_from_status <> 'on' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    UPDATE public.worker_status AS ws
    SET
      current_status = 'break',
      version = v_from_version + 1,
      break_started_at = p_now,
      break_timer_running = true,
      break_late_recorded = false
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'LANJUT' THEN
    IF v_from_status <> 'break' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    v_break_accumulated_secs_before := v_break_accumulated_secs;

    IF v_break_timer_running = true AND v_break_started_at IS NOT NULL THEN
      v_break_accumulated_secs := v_break_accumulated_secs + CASE
        WHEN pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_break_started_at))::integer > 0
          THEN pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_break_started_at))::integer
        ELSE 0
      END;
    END IF;

    v_record_break_late_seconds :=
      greatest(v_break_accumulated_secs - 3600, 0)
      - greatest(v_break_accumulated_secs_before - 3600, 0);

    IF v_record_break_late_seconds > 0 AND NOT v_break_late_recorded THEN
      v_break_late_recorded := true;
      v_record_deltas := pg_catalog.jsonb_build_object(
        'break_late_seconds',
        v_record_break_late_seconds
      );

      INSERT INTO public.worker_records (
        user_id,
        period_month,
        break_late_seconds,
        cuti_stock_delta,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      VALUES (
        p_target_user_id,
        v_period_month,
        v_record_break_late_seconds,
        0,
        'tracker',
        v_audit_action,
        p_now,
        p_now
      )
      ON CONFLICT (user_id, period_month) DO UPDATE
      SET
        break_late_seconds = public.worker_records.break_late_seconds + excluded.break_late_seconds,
        cuti_stock_delta = public.worker_records.cuti_stock_delta + excluded.cuti_stock_delta,
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    END IF;

    UPDATE public.worker_status AS ws
    SET
      current_status = 'on',
      version = v_from_version + 1,
      break_accumulated_secs = v_break_accumulated_secs,
      break_started_at = null,
      break_timer_running = false,
      break_late_recorded = v_break_late_recorded
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'SELESAI' THEN
    IF v_from_status <> 'on' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    UPDATE public.worker_status AS ws
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
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'CUTI' THEN
    IF v_from_status <> 'off' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    IF v_cuti_stock_before <= 0 THEN
      RAISE EXCEPTION 'tracker.cuti_stock_exhausted' USING errcode = '22023';
    END IF;

    v_cuti_stock_after := v_cuti_stock_before - 1;
    v_attendance_status := 'cuti';

    UPDATE public.worker_profiles
    SET cuti_stock = v_cuti_stock_after
    WHERE user_id = p_target_user_id;

    SELECT wa.id, wa.status, coalesce(wa.is_canceled, false)
      INTO v_attendance_id, v_existing_attendance_status, v_existing_attendance_canceled
    FROM public.worker_attendance AS wa
    WHERE wa.user_id = p_target_user_id
      AND wa.attendance_date = v_attendance_date
    LIMIT 1;

    IF v_attendance_id IS NOT NULL THEN
      UPDATE public.worker_attendance
      SET
        status = v_attendance_status,
        source = 'tracker',
        source_action = v_source_action,
        is_canceled = false,
        updated_at = p_now
      WHERE id = v_attendance_id;
    ELSE
      INSERT INTO public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      )
      VALUES (
        p_target_user_id,
        v_attendance_date,
        v_attendance_status,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      RETURNING id INTO v_attendance_id;
    END IF;

    UPDATE public.worker_status AS ws
    SET
      current_status = 'cuti',
      version = v_from_version + 1,
      cuti_set_date = v_attendance_date,
      break_started_at = null,
      break_timer_running = false,
      break_accumulated_secs = 0,
      break_late_recorded = false,
      sakit_started_at = null,
      pending_started_at = null,
      shift_active_date = null,
      shift_active_started_at = null,
      shift_active_label = null,
      shift_active_start_hour = null,
      shift_active_start_min = null,
      shift_active_end_hour = null,
      shift_active_end_min = null,
      lembur_started_at = null
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'IZIN' THEN
    IF v_from_status <> 'off' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    v_attendance_status := 'pending';

    SELECT wa.id, wa.status, coalesce(wa.is_canceled, false)
      INTO v_attendance_id, v_existing_attendance_status, v_existing_attendance_canceled
    FROM public.worker_attendance AS wa
    WHERE wa.user_id = p_target_user_id
      AND wa.attendance_date = v_attendance_date
    LIMIT 1;

    IF v_attendance_id IS NOT NULL THEN
      UPDATE public.worker_attendance
      SET
        status = v_attendance_status,
        source = 'tracker',
        source_action = v_source_action,
        is_canceled = false,
        updated_at = p_now
      WHERE id = v_attendance_id;
    ELSE
      INSERT INTO public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      )
      VALUES (
        p_target_user_id,
        v_attendance_date,
        v_attendance_status,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      RETURNING id INTO v_attendance_id;
    END IF;

    INSERT INTO public.worker_records (
      user_id,
      period_month,
      pending_days,
      cuti_stock_delta,
      last_source,
      last_source_action,
      created_at,
      updated_at
    )
    VALUES (
      p_target_user_id,
      v_period_month,
      1,
      0,
      'tracker',
      v_audit_action,
      p_now,
      p_now
    )
    ON CONFLICT (user_id, period_month) DO UPDATE
    SET
      pending_days = public.worker_records.pending_days + 1,
      cuti_stock_delta = public.worker_records.cuti_stock_delta + excluded.cuti_stock_delta,
      last_source = excluded.last_source,
      last_source_action = excluded.last_source_action,
      updated_at = excluded.updated_at;

    UPDATE public.worker_status AS ws
    SET
      current_status = 'pending',
      version = v_from_version + 1,
      pending_started_at = p_now,
      break_started_at = null,
      break_timer_running = false,
      break_accumulated_secs = 0,
      break_late_recorded = false,
      sakit_started_at = null,
      cuti_set_date = null,
      shift_active_date = null,
      shift_active_started_at = null,
      shift_active_label = null,
      shift_active_start_hour = null,
      shift_active_start_min = null,
      shift_active_end_hour = null,
      shift_active_end_min = null,
      lembur_started_at = null
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;

  ELSIF v_action = 'SAKIT' THEN
    IF v_from_status <> 'off' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    v_attendance_status := 'sakit';

    SELECT wa.id, wa.status, coalesce(wa.is_canceled, false)
      INTO v_attendance_id, v_existing_attendance_status, v_existing_attendance_canceled
    FROM public.worker_attendance AS wa
    WHERE wa.user_id = p_target_user_id
      AND wa.attendance_date = v_attendance_date
    LIMIT 1;

    IF v_attendance_id IS NOT NULL THEN
      UPDATE public.worker_attendance
      SET
        status = v_attendance_status,
        source = 'tracker',
        source_action = v_source_action,
        is_canceled = false,
        updated_at = p_now
      WHERE id = v_attendance_id;
    ELSE
      INSERT INTO public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      )
      VALUES (
        p_target_user_id,
        v_attendance_date,
        v_attendance_status,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      RETURNING id INTO v_attendance_id;
    END IF;

    INSERT INTO public.worker_records (
      user_id,
      period_month,
      sakit_days,
      cuti_stock_delta,
      last_source,
      last_source_action,
      created_at,
      updated_at
    )
    VALUES (
      p_target_user_id,
      v_period_month,
      1,
      0,
      'tracker',
      v_audit_action,
      p_now,
      p_now
    )
    ON CONFLICT (user_id, period_month) DO UPDATE
    SET
      sakit_days = public.worker_records.sakit_days + 1,
      cuti_stock_delta = public.worker_records.cuti_stock_delta + excluded.cuti_stock_delta,
      last_source = excluded.last_source,
      last_source_action = excluded.last_source_action,
      updated_at = excluded.updated_at;

    UPDATE public.worker_status AS ws
    SET
      current_status = 'sakit',
      version = v_from_version + 1,
      sakit_started_at = p_now,
      break_started_at = null,
      break_timer_running = false,
      break_accumulated_secs = 0,
      break_late_recorded = false,
      pending_started_at = null,
      cuti_set_date = null,
      shift_active_date = null,
      shift_active_started_at = null,
      shift_active_label = null,
      shift_active_start_hour = null,
      shift_active_start_min = null,
      shift_active_end_hour = null,
      shift_active_end_min = null,
      lembur_started_at = null
    WHERE ws.user_id = p_target_user_id
    RETURNING ws.current_status, ws.version
      INTO v_to_status, v_to_version;
  END IF;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    v_audit_action,
    'worker_status',
    p_target_user_id::text,
    pg_catalog.jsonb_build_object(
      'from_status', v_from_status,
      'to_status', v_to_status,
      'attendance_date', v_attendance_date,
      'attendance_id', v_attendance_id,
      'record_deltas', v_record_deltas
    ),
    p_target_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'audit_id', v_audit_id,
    'from_status', v_from_status,
    'from_version', v_from_version,
    'target_user_id', p_target_user_id,
    'to_status', v_to_status,
    'to_version', v_to_version
  );
END;
$$;

-- 2. Redefine app_private.apply_tracker_correction_impl using app_private.write_audit_log
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
    END
    INTO v_expected_status;

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

  -- Loosened guard: Only reject if canceled or status does not match
  IF NOT found
    OR v_attendance_is_canceled
    OR v_attendance_status <> v_expected_status
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

  IF v_action = 'CANCEL_SAKIT' THEN
    UPDATE public.worker_records
    SET
      sakit_days = greatest(sakit_days + v_sakit_days_delta, 0),
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_sakit',
      updated_at = p_now
    WHERE user_id = p_target_user_id
      AND period_month = v_period_month;
  ELSIF v_action = 'CANCEL_IZIN' THEN
    UPDATE public.worker_records
    SET
      pending_days = greatest(pending_days + v_pending_days_delta, 0),
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_izin',
      updated_at = p_now
    WHERE user_id = p_target_user_id
      AND period_month = v_period_month;
  END IF;

  UPDATE public.worker_attendance
  SET
    is_canceled = true,
    updated_at = p_now
  WHERE id = p_attendance_id;

  UPDATE public.worker_status as ws
  SET
    current_status = 'off',
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
    break_late_recorded = false,
    updated_at = p_now
  WHERE ws.user_id = p_target_user_id;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    'tracker.' || lower(v_action),
    'worker_attendance',
    p_attendance_id::text,
    pg_catalog.jsonb_build_object(
      'reason', v_reason,
      'attendance_id', p_attendance_id,
      'attendance_date', v_attendance_date,
      'status_reverted', v_from_status,
      'cuti_stock_after', v_cuti_stock_after
    ),
    p_target_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'to_status', 'off',
    'attendance_id', p_attendance_id,
    'version', v_from_version + 1
  );
END;
$$;

-- 3. Redefine app_private.upsert_kompensasi_impl with last_source = 'system' and write_audit_log
CREATE OR REPLACE FUNCTION app_private.upsert_kompensasi_impl(
  p_id uuid,
  p_user_id uuid,
  p_daily_task_id uuid,
  p_date date,
  p_duration_minutes int,
  p_reason text,
  p_proof_url text,
  p_actor_id uuid,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tier text;
  v_show_card boolean;
  v_ret_id uuid;
  v_old_duration int := 0;
  v_delta int := 0;
  v_period_month date;
  v_clean_reason text;
  v_clean_proof text;
BEGIN
  -- 1. Validate actor (Owner or Admin)
  SELECT tier INTO v_tier FROM public.users WHERE id = p_actor_id;
  IF NOT found OR v_tier NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'kompensasi.unauthorized' USING errcode = '42501';
  END IF;

  -- 2. Validate target user
  SELECT show_card INTO v_show_card FROM public.worker_profiles WHERE user_id = p_user_id;
  IF NOT found OR coalesce(v_show_card, false) = false THEN
    RAISE EXCEPTION 'kompensasi.invalid_target' USING errcode = '22023';
  END IF;

  -- 3. Validate duration
  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'kompensasi.invalid_duration' USING errcode = '22023';
  END IF;

  -- 4. Validate reason
  v_clean_reason := pg_catalog.btrim(p_reason);
  IF pg_catalog.char_length(v_clean_reason) = 0 THEN
    RAISE EXCEPTION 'kompensasi.missing_reason' USING errcode = '22023';
  END IF;

  v_clean_proof := pg_catalog.btrim(p_proof_url);
  IF pg_catalog.char_length(v_clean_proof) = 0 THEN
    v_clean_proof := null;
  END IF;

  -- 5. Insert or Update worker_kompensasi
  IF p_id IS NULL THEN
    v_delta := p_duration_minutes;
    INSERT INTO public.worker_kompensasi (
      user_id,
      daily_task_id,
      date,
      duration_minutes,
      reason,
      proof_url,
      created_by,
      created_at,
      updated_at,
      expires_at
    ) VALUES (
      p_user_id,
      p_daily_task_id,
      p_date,
      p_duration_minutes,
      v_clean_reason,
      v_clean_proof,
      p_actor_id,
      p_now,
      p_now,
      p_now + interval '60 days'
    ) RETURNING id INTO v_ret_id;
  ELSE
    SELECT duration_minutes INTO v_old_duration
    FROM public.worker_kompensasi
    WHERE id = p_id
    FOR UPDATE;

    IF NOT found THEN
      RAISE EXCEPTION 'kompensasi.not_found' USING errcode = 'P0002';
    END IF;

    v_delta := p_duration_minutes - v_old_duration;
    v_ret_id := p_id;

    UPDATE public.worker_kompensasi
    SET
      duration_minutes = p_duration_minutes,
      reason = v_clean_reason,
      proof_url = v_clean_proof,
      daily_task_id = coalesce(p_daily_task_id, daily_task_id),
      updated_at = p_now
    WHERE id = p_id;
  END IF;

  -- 6. Upsert into worker_records atomically using 'system' last_source
  v_period_month := date_trunc('month', p_date)::date;

  INSERT INTO public.worker_records (
    user_id,
    period_month,
    kompensasi_duration_mins,
    kompensasi_delta_mins,
    work_late_seconds,
    break_late_seconds,
    alpha_count,
    sakit_days,
    pending_days,
    lembur_units,
    cuti_stock_snapshot,
    last_source,
    last_source_action,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_period_month,
    p_duration_minutes,
    0,
    0, 0, 0, 0, 0, 0,
    coalesce((SELECT cuti_stock FROM public.worker_profiles WHERE user_id = p_user_id), 0),
    'system',
    'kompensasi',
    p_now,
    p_now
  )
  ON CONFLICT (user_id, period_month) DO UPDATE SET
    kompensasi_duration_mins = greatest(0, worker_records.kompensasi_duration_mins + v_delta),
    last_source = 'system',
    last_source_action = 'kompensasi',
    updated_at = p_now;

  -- 7. Audit log
  PERFORM app_private.write_audit_log(
    'daily_task',
    'kompensasi.upsert',
    'worker_kompensasi',
    v_ret_id::text,
    pg_catalog.jsonb_build_object(
      'id', v_ret_id,
      'user_id', p_user_id,
      'daily_task_id', p_daily_task_id,
      'date', p_date,
      'duration_minutes', p_duration_minutes,
      'delta', v_delta,
      'reason', v_clean_reason
    ),
    p_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'id', v_ret_id,
    'duration_minutes', p_duration_minutes,
    'delta', v_delta
  );
END;
$$;

-- 4. Redefine app_private.delete_kompensasi_impl with last_source = 'system' and write_audit_log
CREATE OR REPLACE FUNCTION app_private.delete_kompensasi_impl(
  p_actor_user_id uuid,
  p_id uuid,
  p_user_id uuid,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_tier text;
  v_duration integer;
  v_date date;
  v_period_month date;
  v_reason text;
BEGIN
  -- 1. Validate actor
  SELECT tier INTO v_actor_tier FROM public.users WHERE id = p_actor_user_id AND is_deleted = false;
  IF v_actor_tier IS NULL OR v_actor_tier NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'kompensasi.unauthorized' USING errcode = '42501';
  END IF;

  -- 2. Fetch and lock kompensasi row
  SELECT duration_minutes, date, reason
  INTO v_duration, v_date, v_reason
  FROM public.worker_kompensasi
  WHERE id = p_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'kompensasi.not_found' USING errcode = 'P0002';
  END IF;

  v_period_month := pg_catalog.date_trunc('month', v_date::timestamp)::date;

  -- 3. Delete from worker_kompensasi
  DELETE FROM public.worker_kompensasi WHERE id = p_id;

  -- 4. Deduct duration from worker_records
  UPDATE public.worker_records
  SET
    kompensasi_duration_mins = greatest(0, kompensasi_duration_mins - v_duration),
    last_source = 'system',
    last_source_action = 'delete_kompensasi',
    updated_at = p_now
  WHERE user_id = p_user_id AND period_month = v_period_month;

  -- 5. Audit Log
  PERFORM app_private.write_audit_log(
    'daily_task',
    'kompensasi.delete',
    'worker_kompensasi',
    p_id::text,
    pg_catalog.jsonb_build_object(
      'kompensasi_id', p_id,
      'user_id', p_user_id,
      'deleted_duration_minutes', v_duration,
      'reason', v_reason,
      'date', v_date
    ),
    p_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'id', p_id,
    'deleted_duration_minutes', v_duration
  );
END;
$$;
