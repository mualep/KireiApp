-- Migration: Explicitly populate source and source_action in worker_attendance upsert
CREATE OR REPLACE FUNCTION app_private.sync_absensi_edit_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_date date,
  p_status text,
  p_notes text,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_tier text;
  v_target_exists boolean;
  v_status text := pg_catalog.lower(pg_catalog.btrim(p_status));
  v_notes text := nullif(pg_catalog.btrim(p_notes), '');
  v_before_status text := 'none';
  v_existing_attendance_id uuid;
  v_existing_attendance_is_canceled boolean;
  v_attendance_id uuid;
  v_current_wib_date date;
  v_cuti_stock integer;
  v_audit_id uuid;
  v_correction_id uuid;
BEGIN
  -- 1. Validate Actor
  SELECT tier INTO v_actor_tier FROM public.users WHERE id = p_actor_user_id;
  IF NOT found OR v_actor_tier NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'absensi.unauthorized' USING errcode = '42501';
  END IF;

  -- 2. Validate Target
  SELECT true INTO v_target_exists FROM public.worker_profiles WHERE user_id = p_target_user_id;
  IF NOT found THEN
    RAISE EXCEPTION 'absensi.invalid_target' USING errcode = '22023';
  END IF;

  -- 3. Validate Status
  IF v_status NOT IN ('hadir', 'cuti', 'sakit', 'pending', 'alpha') THEN
    RAISE EXCEPTION 'absensi.invalid_status' USING errcode = '22023';
  END IF;

  v_current_wib_date := (p_now AT TIME ZONE 'Asia/Jakarta')::date;

  -- 4. Get Existing Attendance
  SELECT id, status, is_canceled
  INTO v_existing_attendance_id, v_before_status, v_existing_attendance_is_canceled
  FROM public.worker_attendance
  WHERE user_id = p_target_user_id AND attendance_date = p_date;

  -- CRITICAL FIX: Handle the PL/pgSQL SELECT INTO NULL override when no row is found
  IF v_existing_attendance_id IS NULL THEN
    v_before_status := 'none';
    v_existing_attendance_is_canceled := false;
  ELSE
    v_before_status := coalesce(v_before_status, 'none');
    v_existing_attendance_is_canceled := coalesce(v_existing_attendance_is_canceled, false);
  END IF;

  IF v_existing_attendance_is_canceled THEN
    v_before_status := 'none';
  END IF;

  -- 5. Adjust Cuti Stock in worker_profiles if status changed from/to cuti
  IF coalesce(v_before_status, 'none') = 'cuti' AND v_status <> 'cuti' THEN
    UPDATE public.worker_profiles SET cuti_stock = cuti_stock + 1 WHERE user_id = p_target_user_id;
  ELSIF coalesce(v_before_status, 'none') <> 'cuti' AND v_status = 'cuti' THEN
    SELECT cuti_stock INTO v_cuti_stock FROM public.worker_profiles WHERE user_id = p_target_user_id FOR UPDATE;
    IF v_cuti_stock <= 0 THEN
      RAISE EXCEPTION 'absensi.cuti_stock_exhausted' USING errcode = '23514';
    END IF;
    UPDATE public.worker_profiles SET cuti_stock = cuti_stock - 1 WHERE user_id = p_target_user_id;
  END IF;

  -- 6. Upsert worker_attendance (Explicitly populate source and source_action)
  IF v_existing_attendance_id IS NOT NULL THEN
    UPDATE public.worker_attendance
    SET
      status = v_status,
      notes = v_notes,
      source = 'absensi',
      source_action = 'absensi.correct_' || v_status,
      updated_at = p_now,
      is_canceled = false
    WHERE id = v_existing_attendance_id
    RETURNING id INTO v_attendance_id;
  ELSE
    INSERT INTO public.worker_attendance (
      user_id,
      attendance_date,
      status,
      notes,
      source,
      source_action,
      created_at,
      updated_at,
      is_canceled
    )
    VALUES (
      p_target_user_id,
      p_date,
      v_status,
      v_notes,
      'absensi',
      'absensi.correct_' || v_status,
      p_now,
      p_now,
      false
    )
    RETURNING id INTO v_attendance_id;
  END IF;

  -- 7. If p_date = TODAY: Update worker_status operational state (One-Way Truth)
  IF p_date = v_current_wib_date THEN
    IF v_status = 'hadir' THEN
      UPDATE public.worker_status
      SET
        current_status = 'on',
        shift_active_started_at = coalesce(shift_active_started_at, p_now),
        alpha_done = false,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'sakit' THEN
      UPDATE public.worker_status
      SET
        current_status = 'sakit',
        sakit_started_at = coalesce(sakit_started_at, p_now),
        alpha_done = false,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'pending' THEN
      UPDATE public.worker_status
      SET
        current_status = 'pending',
        pending_started_at = coalesce(pending_started_at, p_now),
        alpha_done = false,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'cuti' THEN
      UPDATE public.worker_status
      SET
        current_status = 'cuti',
        cuti_set_date = p_date,
        alpha_done = false,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'alpha' THEN
      UPDATE public.worker_status
      SET
        current_status = 'off',
        alpha_done = true,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    END IF;
  END IF;

  -- 8. Recalculate worker_records for the month
  PERFORM app_private.recalculate_worker_records(p_target_user_id, p_date);

  -- 9. Log correction and audit (Using strictly whitelisted after_source_action values)
  INSERT INTO public.worker_absensi_corrections (
    attendance_id,
    target_user_id,
    actor_user_id,
    attendance_date,
    before_status,
    after_status,
    before_source,
    after_source,
    after_source_action,
    reason,
    created_at
  )
  VALUES (
    v_attendance_id,
    p_target_user_id,
    p_actor_user_id,
    p_date,
    v_before_status,
    v_status,
    'tracker',
    'absensi',
    'absensi.correct_' || v_status,
    coalesce(v_notes, 'correction'),
    p_now
  )
  RETURNING id INTO v_correction_id;

  v_audit_id := app_private.write_audit_log(
    'absensi',
    'absensi.sync_edit',
    'worker_attendance',
    v_attendance_id::text,
    pg_catalog.jsonb_build_object(
      'target_user_id', p_target_user_id,
      'date', p_date,
      'status', v_status,
      'before_status', v_before_status,
      'correction_id', v_correction_id
    ),
    p_target_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'attendance_id', v_attendance_id,
    'audit_id', v_audit_id,
    'correction_id', v_correction_id
  );
END;
$$;
