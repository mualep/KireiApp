-- Migration: Clear Legacy V1 Override Columns on V2 Delta Override Execution
-- Ensures that whenever apply_records_delta_override is executed, the corresponding V1 _override column is set to NULL to complete V2 transition.

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
  ELSIF pg_catalog.char_length(v_reason) > 50 THEN
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
  ELSIF v_norm_field = 'break_late_seconds' THEN
    SELECT break_late_seconds, break_late_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSIF v_norm_field = 'alpha_count' THEN
    SELECT alpha_count, alpha_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSIF v_norm_field = 'sakit_days' THEN
    SELECT sakit_days, sakit_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSIF v_norm_field = 'pending_days' THEN
    SELECT pending_days, pending_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSIF v_norm_field = 'lembur_units' THEN
    SELECT lembur_units, lembur_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSIF v_norm_field = 'cuti_stock_snapshot' THEN
    SELECT cuti_stock_snapshot, cuti_stock_delta INTO v_existing_auto, v_existing_delta FROM public.worker_records WHERE user_id = p_target_user_id AND period_month = p_period_month FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'records.invalid_field' USING errcode = '22023';
  END IF;

  -- Calculate the new delta
  IF p_desired_value IS NULL THEN
    v_new_delta := 0;
  ELSE
    v_new_delta := p_desired_value - v_existing_auto;
  END IF;

  -- Update the delta column in worker_records AND set legacy V1 override column to NULL
  IF v_norm_field = 'work_late_seconds' THEN
    UPDATE public.worker_records SET work_late_delta = v_new_delta, work_late_override_seconds = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELSIF v_norm_field = 'break_late_seconds' THEN
    UPDATE public.worker_records SET break_late_delta = v_new_delta, break_late_override_seconds = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELSIF v_norm_field = 'alpha_count' THEN
    UPDATE public.worker_records SET alpha_delta = v_new_delta, alpha_override_count = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELSIF v_norm_field = 'sakit_days' THEN
    UPDATE public.worker_records SET sakit_delta = v_new_delta, sakit_override_days = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELSIF v_norm_field = 'pending_days' THEN
    UPDATE public.worker_records SET pending_delta = v_new_delta, pending_override_days = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELSIF v_norm_field = 'lembur_units' THEN
    UPDATE public.worker_records SET lembur_delta = v_new_delta, lembur_override_units = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
  ELSIF v_norm_field = 'cuti_stock_snapshot' THEN
    UPDATE public.worker_records SET cuti_stock_delta = v_new_delta, cuti_stock_override_snapshot = NULL, updated_at = p_now WHERE user_id = p_target_user_id AND period_month = p_period_month;
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

NOTIFY pgrst, 'reload schema';
