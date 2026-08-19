-- Migration: Fix Tracker source_action Prefix and Repair Historical Data
-- Prepend 'tracker.' to source_action in worker_attendance so correction RPCs find attendance records

-- 1. Repair existing worker_attendance records created with unprefixed source_action
UPDATE public.worker_attendance
SET source_action = 'tracker.' || source_action
WHERE source = 'tracker'
  AND source_action IN (
    'start',
    'selesai',
    'istirahat',
    'lanjut',
    'cuti',
    'izin',
    'sakit',
    'cancel_start'
  );

-- 2. Redefine app_private.apply_tracker_action_impl with v_source_action := 'tracker.' || lower(v_action)
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

      IF v_wib_timestamp < v_shift_start_today THEN
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
      v_record_deltas := pg_catalog.jsonb_build_object(
        'work_late_seconds',
        v_record_work_late_seconds
      );

      INSERT INTO public.worker_records (
        user_id,
        period_month,
        work_late_seconds,
        pending_days,
        sakit_days,
        cuti_stock_snapshot,
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
        v_record_pending_days,
        v_record_sakit_days,
        v_record_cuti_stock_snapshot,
        0,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      ON CONFLICT (user_id, period_month) DO UPDATE
      SET
        work_late_seconds = public.worker_records.work_late_seconds + excluded.work_late_seconds,
        pending_days = public.worker_records.pending_days + excluded.pending_days,
        sakit_days = public.worker_records.sakit_days + excluded.sakit_days,
        cuti_stock_snapshot = coalesce(
          excluded.cuti_stock_snapshot,
          public.worker_records.cuti_stock_snapshot
        ),
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
    IF v_from_status <> 'on' OR v_shift_active_date IS NULL THEN
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
      AND wa.attendance_date = v_attendance_date;

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
    IF v_from_status <> 'on' OR v_shift_active_date IS NULL THEN
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

    UPDATE public.worker_profiles
    SET temp_shift = null,
        temp_shift_until = null
    WHERE user_id = p_target_user_id
      AND temp_shift IS NOT NULL;

  ELSIF v_action IN ('CUTI', 'IZIN', 'SAKIT') THEN
    IF v_from_status <> 'off' THEN
      RAISE EXCEPTION 'tracker.invalid_transition' USING errcode = '22023';
    END IF;

    IF v_action = 'CUTI' THEN
      v_attendance_status := 'cuti';
      v_cuti_stock_delta := 1;

      DECLARE
        v_current_stock smallint;
        v_current_delta smallint;
        v_effective_stock integer;
      BEGIN
        SELECT wp.cuti_stock
          INTO v_current_stock
        FROM public.worker_profiles AS wp
        WHERE wp.user_id = p_target_user_id;

        SELECT coalesce(wr.cuti_stock_delta, 0)
          INTO v_current_delta
        FROM public.worker_records AS wr
        WHERE wr.user_id = p_target_user_id
          AND wr.period_month = v_period_month;

        v_effective_stock := coalesce(v_current_stock, 0) + coalesce(v_current_delta, 0);

        IF v_effective_stock < 1 THEN
          RAISE EXCEPTION 'tracker.insufficient_cuti_stock' USING errcode = '22023';
        END IF;
      END;

      v_cuti_stock_after := greatest((v_cuti_stock_before - 1), 0);
      v_cuti_stock_delta_recorded := -1;
      v_record_deltas := pg_catalog.jsonb_build_object('cuti_stock_delta', -1);
    ELSIF v_action = 'IZIN' THEN
      v_attendance_status := 'pending';
      v_record_pending_days := 1;
      v_record_deltas := pg_catalog.jsonb_build_object('pending_days', 1);
    ELSIF v_action = 'SAKIT' THEN
      v_attendance_status := 'sakit';
      v_record_sakit_days := 1;
      v_record_deltas := pg_catalog.jsonb_build_object('sakit_days', 1);
    END IF;

    v_record_cuti_stock_snapshot := v_cuti_stock_after;

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
    ON CONFLICT (user_id, attendance_date) DO UPDATE
    SET
      status = excluded.status,
      source = excluded.source,
      source_action = excluded.source_action,
      is_canceled = false,
      updated_at = excluded.updated_at
    RETURNING id INTO v_attendance_id;

    IF v_action = 'CUTI' THEN
      UPDATE public.worker_profiles
      SET cuti_stock = v_cuti_stock_after
      WHERE user_id = p_target_user_id;
    END IF;

    INSERT INTO public.worker_records (
      user_id,
      period_month,
      work_late_seconds,
      pending_days,
      sakit_days,
      cuti_stock_snapshot,
      cuti_stock_delta,
      last_source,
      last_source_action,
      created_at,
      updated_at
    )
    VALUES (
      p_target_user_id,
      v_period_month,
      0,
      v_record_pending_days,
      v_record_sakit_days,
      v_record_cuti_stock_snapshot,
      v_cuti_stock_delta_recorded,
      'tracker',
      v_source_action,
      p_now,
      p_now
    )
    ON CONFLICT (user_id, period_month) DO UPDATE
    SET
      pending_days = public.worker_records.pending_days + excluded.pending_days,
      sakit_days = public.worker_records.sakit_days + excluded.sakit_days,
      cuti_stock_snapshot = coalesce(
        excluded.cuti_stock_snapshot,
        public.worker_records.cuti_stock_snapshot
      ),
      cuti_stock_delta = public.worker_records.cuti_stock_delta + excluded.cuti_stock_delta,
      last_source = excluded.last_source,
      last_source_action = excluded.last_source_action,
      updated_at = excluded.updated_at;

    UPDATE public.worker_status AS ws
    SET
      current_status = v_attendance_status,
      version = v_from_version + 1,
      cuti_set_date = CASE WHEN v_action = 'CUTI' THEN v_attendance_date ELSE null END,
      pending_started_at = CASE WHEN v_action = 'IZIN' THEN p_now ELSE null END,
      sakit_started_at = CASE WHEN v_action = 'SAKIT' THEN p_now ELSE null END,
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
    p_actor_user_id
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
