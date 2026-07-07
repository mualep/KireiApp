-- Migration: Phase V2-1 Multi-Way Sync & Delta Override
-- 1. Alter Column Types in worker_records to match PRD numeric(6,2) requirement
ALTER TABLE public.worker_records
  ALTER COLUMN sakit_days TYPE numeric(6,2),
  ALTER COLUMN pending_days TYPE numeric(6,2),
  ALTER COLUMN sakit_override_days TYPE numeric(6,2),
  ALTER COLUMN pending_override_days TYPE numeric(6,2);

-- 2. Add Delta Columns to worker_records
ALTER TABLE public.worker_records
  ADD COLUMN work_late_delta integer NOT NULL DEFAULT 0,
  ADD COLUMN break_late_delta integer NOT NULL DEFAULT 0,
  ADD COLUMN alpha_delta smallint NOT NULL DEFAULT 0,
  ADD COLUMN cuti_stock_delta smallint NOT NULL DEFAULT 0,
  ADD COLUMN sakit_delta numeric(6,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN pending_delta numeric(6,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN lembur_delta integer NOT NULL DEFAULT 0;

-- 3. Create Trigger Function to clamp deltas to ensure Floor = 0
CREATE OR REPLACE FUNCTION app_private.clamp_worker_records_deltas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.work_late_delta := greatest(NEW.work_late_delta, -NEW.work_late_seconds);
  NEW.break_late_delta := greatest(NEW.break_late_delta, -NEW.break_late_seconds);
  NEW.alpha_delta := greatest(NEW.alpha_delta, -NEW.alpha_count);
  NEW.sakit_delta := greatest(NEW.sakit_delta, -NEW.sakit_days);
  NEW.pending_delta := greatest(NEW.pending_delta, -NEW.pending_days);
  NEW.lembur_delta := greatest(NEW.lembur_delta, -NEW.lembur_units);
  IF NEW.cuti_stock_snapshot IS NOT NULL THEN
    NEW.cuti_stock_delta := greatest(NEW.cuti_stock_delta, -NEW.cuti_stock_snapshot);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER clamp_worker_records_deltas_trigger
  BEFORE INSERT OR UPDATE ON public.worker_records
  FOR EACH ROW
  EXECUTE FUNCTION app_private.clamp_worker_records_deltas();

-- 4. Add CHECK Constraints to guarantee Floor = 0 on effective values
ALTER TABLE public.worker_records
  ADD CONSTRAINT worker_records_work_late_effective_check CHECK (work_late_seconds + work_late_delta >= 0),
  ADD CONSTRAINT worker_records_break_late_effective_check CHECK (break_late_seconds + break_late_delta >= 0),
  ADD CONSTRAINT worker_records_alpha_effective_check CHECK (alpha_count + alpha_delta >= 0),
  ADD CONSTRAINT worker_records_sakit_effective_check CHECK (sakit_days + sakit_delta >= 0),
  ADD CONSTRAINT worker_records_pending_effective_check CHECK (pending_days + pending_delta >= 0),
  ADD CONSTRAINT worker_records_lembur_effective_check CHECK (lembur_units + lembur_delta >= 0),
  ADD CONSTRAINT worker_records_cuti_stock_effective_check CHECK (cuti_stock_snapshot IS NULL OR cuti_stock_snapshot + cuti_stock_delta >= 0);

-- 5. Create Recalculation Helper for worker_records
CREATE OR REPLACE FUNCTION app_private.recalculate_worker_records(
  p_user_id uuid,
  p_month date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month_start date := pg_catalog.date_trunc('month', p_month::timestamp)::date;
  v_alpha_count integer;
  v_sakit_days numeric(6,2);
  v_pending_days numeric(6,2);
  v_cuti_days integer;
  v_profile_cuti_stock integer;
BEGIN
  -- Count statuses from worker_attendance for the given month
  SELECT
    coalesce(count(*)::integer FILTER (WHERE status = 'alpha' AND is_canceled = false), 0),
    coalesce(count(*)::numeric(6,2) FILTER (WHERE status = 'sakit' AND is_canceled = false), 0),
    coalesce(count(*)::numeric(6,2) FILTER (WHERE status = 'pending' AND is_canceled = false), 0),
    coalesce(count(*)::integer FILTER (WHERE status = 'cuti' AND is_canceled = false), 0)
  INTO v_alpha_count, v_sakit_days, v_pending_days, v_cuti_days
  FROM public.worker_attendance
  WHERE user_id = p_user_id
    AND attendance_date >= v_month_start
    AND attendance_date < (v_month_start + interval '1 month')::date;

  -- Get worker profiles current cuti_stock
  SELECT cuti_stock INTO v_profile_cuti_stock
  FROM public.worker_profiles
  WHERE user_id = p_user_id;

  -- Ensure row exists and upsert auto-aggregates
  INSERT INTO public.worker_records (
    user_id,
    period_month,
    alpha_count,
    sakit_days,
    pending_days,
    cuti_stock_snapshot,
    last_source,
    last_source_action,
    updated_at
  )
  VALUES (
    p_user_id,
    v_month_start,
    v_alpha_count,
    v_sakit_days,
    v_pending_days,
    v_profile_cuti_stock,
    'system',
    'system.recalculate',
    pg_catalog.clock_timestamp()
  )
  ON CONFLICT (user_id, period_month) DO UPDATE
  SET
    alpha_count = excluded.alpha_count,
    sakit_days = excluded.sakit_days,
    pending_days = excluded.pending_days,
    cuti_stock_snapshot = coalesce(excluded.cuti_stock_snapshot, public.worker_records.cuti_stock_snapshot),
    last_source = 'system',
    last_source_action = 'system.recalculate',
    updated_at = pg_catalog.clock_timestamp();
END;
$$;

-- 6. Create apply_records_delta_override RPC
CREATE OR REPLACE FUNCTION app_private.apply_records_delta_override_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_period_month date,
  p_field_name text,
  p_desired_value numeric,
  p_reason text,
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
  v_is_deleted boolean;
  v_existing_auto numeric;
  v_existing_delta numeric;
  v_new_delta numeric;
  v_reason text;
  v_ledger_id uuid;
  v_audit_id uuid;
  v_norm_field text;
BEGIN
  -- Validate actor (Must be Owner or Admin)
  SELECT tier INTO v_tier FROM public.users WHERE id = p_actor_user_id;
  IF NOT found OR v_tier NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'records.unauthorized' USING errcode = '42501';
  END IF;

  -- Validate target (Must exist and show_card)
  SELECT wp.show_card
  INTO v_show_card
  FROM public.worker_profiles as wp
  WHERE wp.user_id = p_target_user_id;

  IF NOT found OR coalesce(v_show_card, false) = false THEN
    RAISE EXCEPTION 'records.invalid_target' USING errcode = '22023';
  END IF;

  -- Validate value (cannot be negative)
  IF p_desired_value IS NOT NULL AND p_desired_value < 0 THEN
    RAISE EXCEPTION 'records.invalid_value' USING errcode = '22023';
  END IF;

  v_reason := pg_catalog.btrim(p_reason);
  IF pg_catalog.char_length(v_reason) = 0 THEN
    v_reason := null;
  ELIF pg_catalog.char_length(v_reason) > 50 THEN
    RAISE EXCEPTION 'records.invalid_value' USING errcode = '22023';
  END IF;

  -- Map override field names to standard names
  v_norm_field := CASE p_field_name
    WHEN 'work_late_override_seconds' THEN 'work_late_seconds'
    WHEN 'break_late_override_seconds' THEN 'break_late_seconds'
    WHEN 'alpha_override_count' THEN 'alpha_count'
    WHEN 'sakit_override_days' THEN 'sakit_days'
    WHEN 'pending_override_days' THEN 'pending_days'
    WHEN 'lembur_override_units' THEN 'lembur_units'
    WHEN 'cuti_stock_override_snapshot' THEN 'cuti_stock_snapshot'
    ELSE p_field_name
  END;

  -- Ensure the worker record exists for this period_month
  INSERT INTO public.worker_records (
    user_id,
    period_month,
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
    p_target_user_id,
    p_period_month,
    0, 0, 0, 0, 0, 0,
    coalesce((SELECT cuti_stock FROM public.worker_profiles WHERE user_id = p_target_user_id), 0),
    'system',
    'system.delta_override_init',
    p_now,
    p_now
  )
  ON CONFLICT (user_id, period_month) DO NOTHING;

  -- Lock row and get current auto-aggregate value and existing delta
  IF v_norm_field = 'work_late_seconds' THEN
    SELECT work_late_seconds, work_late_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELIF v_norm_field = 'break_late_seconds' THEN
    SELECT break_late_seconds, break_late_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELIF v_norm_field = 'alpha_count' THEN
    SELECT alpha_count, alpha_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELIF v_norm_field = 'sakit_days' THEN
    SELECT sakit_days, sakit_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELIF v_norm_field = 'pending_days' THEN
    SELECT pending_days, pending_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELIF v_norm_field = 'lembur_units' THEN
    SELECT lembur_units, lembur_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELIF v_norm_field = 'cuti_stock_snapshot' THEN
    SELECT cuti_stock_snapshot, cuti_stock_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'records.invalid_field' USING errcode = '22023';
  END IF;

  -- Calculate the new delta
  v_new_delta := p_desired_value - v_existing_auto;

  -- Update the delta column in worker_records
  IF v_norm_field = 'work_late_seconds' THEN
    UPDATE public.worker_records SET work_late_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELIF v_norm_field = 'break_late_seconds' THEN
    UPDATE public.worker_records SET break_late_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELIF v_norm_field = 'alpha_count' THEN
    UPDATE public.worker_records SET alpha_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELIF v_norm_field = 'sakit_days' THEN
    UPDATE public.worker_records SET sakit_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELIF v_norm_field = 'pending_days' THEN
    UPDATE public.worker_records SET pending_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELIF v_norm_field = 'lembur_units' THEN
    UPDATE public.worker_records SET lembur_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELIF v_norm_field = 'cuti_stock_snapshot' THEN
    UPDATE public.worker_records SET cuti_stock_delta = v_new_delta, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  END IF;

  -- Write to delta override ledger (reusing worker_records_override_log)
  INSERT INTO public.worker_records_override_log (
    target_user_id,
    actor_user_id,
    period_month,
    field_name,
    before_value,
    after_value,
    reason,
    created_at
  ) VALUES (
    p_target_user_id,
    p_actor_user_id,
    p_period_month,
    p_field_name,
    (v_existing_auto + v_existing_delta)::integer,
    p_desired_value::integer,
    v_reason,
    p_now
  ) RETURNING id into v_ledger_id;

  v_audit_id := app_private.write_audit_log(
    'records',
    'records.delta_override',
    'worker_records',
    p_target_user_id::text,
    pg_catalog.jsonb_build_object(
      'field_name', p_field_name,
      'auto_value', v_existing_auto,
      'old_delta', v_existing_delta,
      'new_delta', v_new_delta,
      'desired_value', p_desired_value,
      'period_month', p_period_month,
      'reason', v_reason
    ),
    p_target_user_id
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'ledger_id', v_ledger_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_records_delta_override(
  p_target_user_id uuid,
  p_period_month date,
  p_field_name text,
  p_desired_value numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN app_private.apply_records_delta_override_impl(
    auth.uid(),
    p_target_user_id,
    p_period_month,
    p_field_name,
    p_desired_value,
    p_reason,
    pg_catalog.clock_timestamp()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_records_delta_override(uuid, date, text, numeric, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.apply_records_delta_override(uuid, date, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_records_delta_override(uuid, date, text, numeric, text) TO authenticated;

-- 7. Create sync_absensi_to_tracker & sync_absensi_edit
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

  -- 6. Upsert worker_attendance
  IF v_existing_attendance_id IS NOT NULL THEN
    UPDATE public.worker_attendance
    SET
      status = v_status,
      notes = v_notes,
      source = 'absensi',
      source_action = 'absensi.edit_cell',
      updated_by = p_actor_user_id,
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
      updated_by,
      created_at,
      updated_at
    )
    VALUES (
      p_target_user_id,
      p_date,
      v_status,
      v_notes,
      'absensi',
      'absensi.edit_cell',
      p_actor_user_id,
      p_now,
      p_now
    )
    RETURNING id INTO v_attendance_id;
  END IF;

  -- 7. If p_date = TODAY: Update worker_status operational state (One-Way Truth)
  IF p_date = v_current_wib_date THEN
    IF v_status = 'hadir' THEN
      UPDATE public.worker_status
      SET
        status = 'on',
        shift_started_at = coalesce(shift_started_at, p_now),
        alpha_done = false,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'sakit' THEN
      UPDATE public.worker_status
      SET
        status = 'sakit',
        sakit_started_at = coalesce(sakit_started_at, p_now),
        sakit_set_date = p_date,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'pending' THEN
      UPDATE public.worker_status
      SET
        status = 'pending',
        pending_started_at = coalesce(pending_started_at, p_now),
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'cuti' THEN
      UPDATE public.worker_status
      SET
        status = 'cuti',
        cuti_set_date = p_date,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    ELSIF v_status = 'alpha' THEN
      UPDATE public.worker_status
      SET
        status = 'off',
        alpha_done = true,
        updated_at = p_now
      WHERE user_id = p_target_user_id;
    END IF;
  END IF;

  -- 8. Recalculate worker_records for the month
  PERFORM app_private.recalculate_worker_records(p_target_user_id, p_date);

  -- 9. Log correction and audit
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
    'absensi.edit_cell',
    v_notes,
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

-- Expose sync_absensi_edit RPC
CREATE OR REPLACE FUNCTION public.sync_absensi_edit(
  p_target_user_id uuid,
  p_date date,
  p_status text,
  p_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN app_private.sync_absensi_edit_impl(
    auth.uid(),
    p_target_user_id,
    p_date,
    p_status,
    p_notes,
    pg_catalog.clock_timestamp()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_absensi_edit(uuid, date, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_absensi_edit(uuid, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_absensi_edit(uuid, date, text, text) TO authenticated;

-- Expose sync_absensi_to_tracker RPC
CREATE OR REPLACE FUNCTION public.sync_absensi_to_tracker(
  p_target_user_id uuid,
  p_date date,
  p_status text,
  p_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.sync_absensi_edit(p_target_user_id, p_date, p_status, p_notes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_absensi_to_tracker(uuid, date, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_absensi_to_tracker(uuid, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_absensi_to_tracker(uuid, date, text, text) TO authenticated;

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
