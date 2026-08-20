-- Migration: Stored Procedure for Safe Kompensasi Upsert and Worker Records Sync

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

  -- 6. Upsert into worker_records atomically
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
    'daily_task',
    'kompensasi',
    p_now,
    p_now
  )
  ON CONFLICT (user_id, period_month) DO UPDATE SET
    kompensasi_duration_mins = greatest(0, worker_records.kompensasi_duration_mins + v_delta),
    last_source = 'daily_task',
    last_source_action = 'kompensasi',
    updated_at = p_now;

  -- 7. Audit log
  PERFORM app_private.write_audit_log(
    'daily_task',
    'daily_task.kompensasi_upsert',
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

-- Public RPC endpoint
CREATE OR REPLACE FUNCTION public.upsert_kompensasi(
  p_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_daily_task_id uuid DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_duration_minutes int DEFAULT 0,
  p_reason text DEFAULT '',
  p_proof_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'auth.unauthenticated' USING errcode = '42501';
  END IF;

  RETURN app_private.upsert_kompensasi_impl(
    p_id,
    p_user_id,
    p_daily_task_id,
    p_date,
    p_duration_minutes,
    p_reason,
    p_proof_url,
    v_actor_id,
    now()
  );
END;
$$;
