-- Migration: Temporary Shift Auto-Revert & Double-ALPHA Guard Enforcement
-- 1. Redefines app_private.apply_tracker_action_impl to auto-revert temp_shift when action is 'SELESAI'
-- 2. Redefines app_private.execute_cron_state_machine to:
--    a) Clean up expired temp_shift (temp_shift_until <= p_now)
--    b) Auto-revert temp_shift when AUTO_OFF_SHIFT fires
--    c) Enforce Double-ALPHA guard (skip AUTO_ALPHA if worker attendance already recorded for target_date)

create or replace function app_private.apply_tracker_action_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_expected_version bigint,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
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
begin
  if p_actor_user_id is null then
    raise exception 'tracker.unauthenticated' using errcode = '42501';
  end if;

  select u.tier
    into v_actor_tier
  from public.users as u
  where u.id = p_actor_user_id
    and u.is_deleted = false
    and u.tier in ('owner', 'admin')
  limit 1;

  if v_actor_tier is null then
    raise exception 'tracker.unauthorized' using errcode = '42501';
  end if;

  if v_action is null or v_action not in (
    'START',
    'ISTIRAHAT',
    'LANJUT',
    'SELESAI',
    'CUTI',
    'IZIN',
    'SAKIT',
    'CANCEL_START'
  ) then
    raise exception 'tracker.invalid_action' using errcode = '22023';
  end if;

  if p_target_user_id is null then
    raise exception 'tracker.target_not_found' using errcode = 'P0002';
  end if;

  select
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
  into
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
  from public.worker_profiles as wp
  join public.worker_status as ws on ws.user_id = wp.user_id
  where wp.user_id = p_target_user_id
    and wp.show_card = true
  for update of ws;

  if not found then
    raise exception 'tracker.target_not_found' using errcode = 'P0002';
  end if;

  if p_expected_version is null or p_expected_version <> v_from_version then
    raise exception 'tracker.version_mismatch' using errcode = '40001';
  end if;

  v_wib_timestamp := p_now at time zone 'Asia/Jakarta';
  v_wib_date := v_wib_timestamp::date;

  if v_is_flexible or v_shift_start_hour is null or v_shift_start_min is null or v_shift_end_hour is null or v_shift_end_min is null then
    v_attendance_date := v_wib_date;
  else
    v_current_wib_minutes := (pg_catalog.date_part('hour', v_wib_timestamp)::integer * 60) + pg_catalog.date_part('minute', v_wib_timestamp)::integer;
    v_shift_start_minutes := (v_shift_start_hour * 60) + v_shift_start_min;
    v_shift_end_minutes := (v_shift_end_hour * 60) + v_shift_end_min;

    declare
      v_shift_start_today timestamp;
      v_cycle_date date;
    begin
      v_shift_start_today := pg_catalog.make_timestamp(
        pg_catalog.date_part('year', v_wib_date::timestamp)::integer,
        pg_catalog.date_part('month', v_wib_date::timestamp)::integer,
        pg_catalog.date_part('day', v_wib_date::timestamp)::integer,
        v_shift_start_hour,
        v_shift_start_min,
        0
      );

      if v_wib_timestamp < v_shift_start_today then
        v_cycle_date := v_wib_date - 1;
      else
        v_cycle_date := v_wib_date;
      end if;

      if v_shift_start_hour < 6 then
        v_attendance_date := v_cycle_date - 1;
      else
        v_attendance_date := v_cycle_date;
      end if;

      if v_shift_start_hour = 0 then
        v_cycle_date := v_attendance_date + 1;
        v_shift_end_date := v_attendance_date + 1;
      elsif v_shift_end_hour < v_shift_start_hour or (v_shift_end_hour = 0 and v_shift_start_hour > 0) then
        v_cycle_date := v_attendance_date;
        v_shift_end_date := v_attendance_date + 1;
      else
        v_cycle_date := v_attendance_date;
        v_shift_end_date := v_attendance_date;
      end if;

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
    end;
  end if;

  v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;
  v_source_action := lower(v_action);
  v_audit_action := 'tracker.' || v_source_action;

  if v_action = 'START' then
    if v_from_status <> 'off' then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    if not v_is_flexible and v_grace_at is not null and p_now >= v_grace_at then
      v_record_work_late_seconds := case
        when pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer > 0
          then pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer
        else 0
      end;
    end if;

    v_attendance_status := 'hadir';

    select wa.id, wa.status, coalesce(wa.is_canceled, false)
      into v_attendance_id, v_existing_attendance_status, v_existing_attendance_canceled
    from public.worker_attendance as wa
    where wa.user_id = p_target_user_id
      and wa.attendance_date = v_attendance_date
    limit 1;

    if v_attendance_id is not null then
      update public.worker_attendance
      set
        status = v_attendance_status,
        source = 'tracker',
        source_action = v_source_action,
        is_canceled = false,
        updated_at = p_now
      where id = v_attendance_id;
    else
      insert into public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      )
      values (
        p_target_user_id,
        v_attendance_date,
        v_attendance_status,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      returning id into v_attendance_id;
    end if;

    if v_record_work_late_seconds > 0 then
      v_record_deltas := pg_catalog.jsonb_build_object(
        'work_late_seconds',
        v_record_work_late_seconds
      );

      insert into public.worker_records (
        user_id,
        period_month,
        work_late_seconds,
        pending_days,
        sakit_days,
        cuti_stock_snapshot,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      values (
        p_target_user_id,
        v_period_month,
        v_record_work_late_seconds,
        v_record_pending_days,
        v_record_sakit_days,
        v_record_cuti_stock_snapshot,
        'tracker',
        v_source_action,
        p_now,
        p_now
      )
      on conflict (user_id, period_month) do update
      set
        work_late_seconds = public.worker_records.work_late_seconds + excluded.work_late_seconds,
        pending_days = public.worker_records.pending_days + excluded.pending_days,
        sakit_days = public.worker_records.sakit_days + excluded.sakit_days,
        cuti_stock_snapshot = coalesce(
          excluded.cuti_stock_snapshot,
          public.worker_records.cuti_stock_snapshot
        ),
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    end if;

    update public.worker_status as ws
    set
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
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;

  elsif v_action = 'CANCEL_START' then
    if v_from_status <> 'on' or v_shift_active_date is null then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    if not v_is_flexible and v_shift_active_started_at is not null and v_grace_at is not null then
      if v_shift_active_started_at >= v_grace_at then
        v_record_work_late_seconds := case
          when pg_catalog.floor(pg_catalog.date_part('epoch', v_shift_active_started_at - v_grace_at))::integer > 0
            then pg_catalog.floor(pg_catalog.date_part('epoch', v_shift_active_started_at - v_grace_at))::integer
          else 0
        end;
      end if;
    end if;

    if v_record_work_late_seconds > 0 then
      update public.worker_records
      set
        work_late_seconds = greatest(work_late_seconds - v_record_work_late_seconds, 0),
        last_source = 'tracker',
        last_source_action = 'tracker.cancel_start',
        updated_at = p_now
      where user_id = p_target_user_id
        and period_month = v_period_month;
    end if;

    delete from public.worker_attendance as wa
    where wa.user_id = p_target_user_id
      and wa.attendance_date = v_attendance_date;

    update public.worker_status as ws
    set
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
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;

  elsif v_action = 'ISTIRAHAT' then
    if v_from_status <> 'on' then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    update public.worker_status as ws
    set
      current_status = 'break',
      version = v_from_version + 1,
      break_started_at = p_now,
      break_timer_running = true,
      break_late_recorded = false
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;

  elsif v_action = 'LANJUT' then
    if v_from_status <> 'break' then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    v_break_accumulated_secs_before := v_break_accumulated_secs;

    if v_break_timer_running = true and v_break_started_at is not null then
      v_break_accumulated_secs := v_break_accumulated_secs + case
        when pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_break_started_at))::integer > 0
          then pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_break_started_at))::integer
        else 0
      end;
    end if;

    v_record_break_late_seconds :=
      greatest(v_break_accumulated_secs - 3600, 0)
      - greatest(v_break_accumulated_secs_before - 3600, 0);

    if v_record_break_late_seconds > 0 and not v_break_late_recorded then
      v_break_late_recorded := true;
      v_record_deltas := pg_catalog.jsonb_build_object(
        'break_late_seconds',
        v_record_break_late_seconds
      );

      insert into public.worker_records (
        user_id,
        period_month,
        break_late_seconds,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      values (
        p_target_user_id,
        v_period_month,
        v_record_break_late_seconds,
        'tracker',
        v_audit_action,
        p_now,
        p_now
      )
      on conflict (user_id, period_month) do update
      set
        break_late_seconds = public.worker_records.break_late_seconds + excluded.break_late_seconds,
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    end if;

    update public.worker_status as ws
    set
      current_status = 'on',
      version = v_from_version + 1,
      break_accumulated_secs = v_break_accumulated_secs,
      break_started_at = null,
      break_timer_running = false,
      break_late_recorded = v_break_late_recorded
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;

  elsif v_action = 'SELESAI' then
    if v_from_status <> 'on' or v_shift_active_date is null then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    update public.worker_status as ws
    set
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
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;

    -- FR-SHIFT-01 Auto-revert temp shift upon manual shift completion (SELESAI)
    update public.worker_profiles
    set temp_shift = null,
        temp_shift_until = null
    where user_id = p_target_user_id
      and temp_shift is not null;

  elsif v_action in ('CUTI', 'IZIN', 'SAKIT') then
    if v_from_status <> 'off' then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    if v_action = 'CUTI' then
      v_attendance_status := 'cuti';
      v_cuti_stock_delta := 1;

      declare
        v_current_stock smallint;
        v_current_delta smallint;
        v_effective_stock integer;
      begin
        select wp.cuti_stock
          into v_current_stock
        from public.worker_profiles as wp
        where wp.user_id = p_target_user_id;

        select coalesce(wr.cuti_stock_delta, 0)
          into v_current_delta
        from public.worker_records as wr
        where wr.user_id = p_target_user_id
          and wr.period_month = v_period_month;

        v_effective_stock := coalesce(v_current_stock, 0) + coalesce(v_current_delta, 0);

        if v_effective_stock < 1 then
          raise exception 'tracker.insufficient_cuti_stock' using errcode = '22023';
        end if;
      end;

      v_cuti_stock_after := greatest((v_cuti_stock_before - 1), 0);
      v_cuti_stock_delta_recorded := -1;
      v_record_deltas := pg_catalog.jsonb_build_object('cuti_stock_delta', -1);
    elsif v_action = 'IZIN' then
      v_attendance_status := 'pending';
      v_record_pending_days := 1;
      v_record_deltas := pg_catalog.jsonb_build_object('pending_days', 1);
    elsif v_action = 'SAKIT' then
      v_attendance_status := 'sakit';
      v_record_sakit_days := 1;
      v_record_deltas := pg_catalog.jsonb_build_object('sakit_days', 1);
    end if;

    v_record_cuti_stock_snapshot := v_cuti_stock_after;

    insert into public.worker_attendance (
      user_id,
      attendance_date,
      status,
      source,
      source_action,
      created_at,
      updated_at
    )
    values (
      p_target_user_id,
      v_attendance_date,
      v_attendance_status,
      'tracker',
      v_source_action,
      p_now,
      p_now
    )
    on conflict (user_id, attendance_date) do update
    set
      status = excluded.status,
      source = excluded.source,
      source_action = excluded.source_action,
      is_canceled = false,
      updated_at = excluded.updated_at
    returning id into v_attendance_id;

    if v_action = 'CUTI' then
      update public.worker_profiles
      set cuti_stock = v_cuti_stock_after
      where user_id = p_target_user_id;
    end if;

    insert into public.worker_records (
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
    values (
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
    on conflict (user_id, period_month) do update
    set
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

    update public.worker_status as ws
    set
      current_status = v_attendance_status,
      version = v_from_version + 1,
      cuti_set_date = case when v_action = 'CUTI' then v_attendance_date else null end,
      pending_started_at = case when v_action = 'IZIN' then p_now else null end,
      sakit_started_at = case when v_action = 'SAKIT' then p_now else null end,
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
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;
  end if;

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

  return pg_catalog.jsonb_build_object(
    'audit_id', v_audit_id,
    'from_status', v_from_status,
    'from_version', v_from_version,
    'target_user_id', p_target_user_id,
    'to_status', v_to_status,
    'to_version', v_to_version
  );
end;
$$;


-- Redefine app_private.execute_cron_state_machine with Temp Shift Auto-Revert & Double-ALPHA Guard
create or replace function app_private.execute_cron_state_machine(p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_wib_timestamp timestamptz;
  v_wib_date date;
  v_current_wib_minutes integer;
  
  -- Shift variables
  v_is_flexible boolean;
  v_shift_start_hour integer;
  v_shift_start_min integer;
  v_shift_end_hour integer;
  v_shift_end_min integer;
  
  v_shift_start_minutes integer;
  v_shift_end_minutes integer;
  v_attendance_date date;
  v_shift_end_date date;
  v_shift_starts_at timestamptz;
  v_shift_ends_at timestamptz;
  
  v_period_month date;
  v_expiry_time timestamptz;
  
  v_audit_id uuid;
  v_attendance_id uuid;
  
  v_total_break_secs integer;
  v_record_break_late_seconds integer;
begin
  -- 0. Standalone Cleanup: Auto-revert any temp shifts whose duration has expired
  update public.worker_profiles
  set temp_shift = null,
      temp_shift_until = null
  where temp_shift_until is not null
    and temp_shift_until <= p_now;

  -- Loop through all workers with show_card = true
  for r in
    select 
      wp.user_id,
      coalesce(
        case when wp.temp_shift is not null and wp.temp_shift_until is not null and wp.temp_shift_until > p_now
          then wp.temp_shift
          else wp.shift
        end,
        wp.shift
      ) as shift,
      wp.is_flexible,
      wp.shift_start_hour,
      wp.shift_start_min,
      wp.shift_end_hour,
      wp.shift_end_min,
      wp.temp_shift,
      wp.temp_shift_until,
      ws.current_status,
      ws.version,
      ws.alpha_done,
      ws.shift_active_date,
      ws.break_started_at,
      ws.break_timer_running,
      ws.break_accumulated_secs,
      ws.break_late_recorded,
      ws.sakit_started_at
    from public.worker_profiles wp
    join public.worker_status ws on wp.user_id = ws.user_id
    where wp.show_card = true
  loop
    -- Calculate derived shift details for this worker
    v_is_flexible := r.is_flexible;
    
    if not v_is_flexible then
      v_shift_start_hour := r.shift_start_hour;
      v_shift_start_min := r.shift_start_min;
      v_shift_end_hour := r.shift_end_hour;
      v_shift_end_min := r.shift_end_min;
      
      -- We must have valid shift times for non-flexible workers
      if v_shift_start_hour is not null 
         and v_shift_start_min is not null 
         and v_shift_end_hour is not null 
         and v_shift_end_min is not null 
      then
        v_wib_timestamp := p_now at time zone 'Asia/Jakarta';
        v_wib_date := v_wib_timestamp::date;
        v_current_wib_minutes := 
          (pg_catalog.date_part('hour', v_wib_timestamp)::integer * 60)
          + pg_catalog.date_part('minute', v_wib_timestamp)::integer;
          
        v_shift_start_minutes := (v_shift_start_hour * 60) + v_shift_start_min;
        v_shift_end_minutes := (v_shift_end_hour * 60) + v_shift_end_min;
        
        -- Calculate the cycle calendar date (v_cycle_date)
        declare
          v_shift_start_today timestamptz;
          v_cycle_date date;
        begin
          v_shift_start_today := pg_catalog.make_timestamptz(
            pg_catalog.date_part('year', v_wib_date::timestamp)::integer,
            pg_catalog.date_part('month', v_wib_date::timestamp)::integer,
            pg_catalog.date_part('day', v_wib_date::timestamp)::integer,
            v_shift_start_hour,
            v_shift_start_min,
            0,
            'Asia/Jakarta'
          );
          
          if p_now < v_shift_start_today then
            v_cycle_date := v_wib_date - 1;
          else
            v_cycle_date := v_wib_date;
          end if;
          
          if v_shift_start_hour < 6 then
            v_attendance_date := v_cycle_date - 1;
          else
            v_attendance_date := v_cycle_date;
          end if;
          
          if v_shift_start_hour = 0 then
            v_cycle_date := v_attendance_date + 1;
            v_shift_end_date := v_attendance_date + 1;
          elsif v_shift_end_hour < v_shift_start_hour or (v_shift_end_hour = 0 and v_shift_start_hour > 0) then
            v_cycle_date := v_attendance_date;
            v_shift_end_date := v_attendance_date + 1;
          else
            v_cycle_date := v_attendance_date;
            v_shift_end_date := v_attendance_date;
          end if;

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
        end;
        
        v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;
        
        -- 1. ALPHA_DONE_RESET
        if r.alpha_done = true and r.current_status = 'off' then
          if p_now >= v_shift_starts_at and p_now < v_shift_ends_at then
            update public.worker_status
            set alpha_done = false, version = version + 1, updated_at = p_now
            where user_id = r.user_id;
            
            perform app_private.write_audit_log(
              'cron',
              'cron.alpha_done_reset',
              'worker_status',
              r.user_id::text,
              jsonb_build_object('message', 'Reset alpha_done flag for new shift cycle'),
              r.user_id
            );
          end if;
        end if;
        
        -- 3. AUTO_ALPHA (FR-SHIFT-02 DOUBLE-ALPHA GUARD ENFORCED)
        -- jika worker masih status=off, alpha_done=false, dan p_now >= v_shift_ends_at -> set alpha_done=true, tulis attendance alpha, dan update records secara idempotent.
        -- GUARD: Skip AUTO_ALPHA jika worker sudah memiliki catatan absensi (hadir, cuti, sakit, pending) pada v_attendance_date tersebut.
        if r.current_status = 'off' and r.alpha_done = false then
          if p_now >= v_shift_ends_at then
            if not exists (
              select 1 from public.worker_attendance as wa
              where wa.user_id = r.user_id
                and wa.attendance_date = v_attendance_date
                and coalesce(wa.is_canceled, false) = false
            ) then
              -- Tulis attendance 'alpha' secara idempotent
              v_attendance_id := null;
              
              insert into public.worker_attendance (
                user_id,
                attendance_date,
                status,
                source,
                source_action,
                created_at,
                updated_at
              )
              values (
                r.user_id,
                v_attendance_date,
                'alpha',
                'cron',
                'cron.auto_alpha',
                p_now,
                p_now
              )
              on conflict on constraint worker_attendance_user_date_key do nothing
              returning id into v_attendance_id;
              
              -- Set alpha_done = true
              update public.worker_status
              set alpha_done = true, version = version + 1, updated_at = p_now
              where user_id = r.user_id;
              
              -- If successfully inserted new attendance row, increment records
              if v_attendance_id is not null then
                insert into public.worker_records (
                  user_id,
                  period_month,
                  alpha_count,
                  last_source,
                  last_source_action,
                  created_at,
                  updated_at
                )
                values (
                  r.user_id,
                  v_period_month,
                  1,
                  'cron',
                  'cron.auto_alpha',
                  p_now,
                  p_now
                )
                on conflict (user_id, period_month) do update
                set 
                  alpha_count = public.worker_records.alpha_count + 1,
                  last_source = 'cron',
                  last_source_action = 'cron.auto_alpha',
                  updated_at = p_now;
              end if;
              
              perform app_private.write_audit_log(
                'cron',
                'cron.auto_alpha',
                'worker_status',
                r.user_id::text,
                jsonb_build_object('attendance_date', v_attendance_date, 'message', 'Worker failed to clock in before shift end. Marked as ALPHA.'),
                r.user_id
              );
            end if;
          end if;
        end if;
        
        -- 4. AUTO_OFF_SHIFT (FR-SHIFT-01 AUTO-REVERT ENFORCED)
        if r.current_status in ('on', 'break') then
          declare
            v_act_date date := coalesce(r.shift_active_date, v_attendance_date);
            v_act_ends_at timestamptz;
          begin
            if v_shift_start_hour = 0 then
              v_shift_end_date := v_act_date + 1;
            elsif v_shift_end_hour < v_shift_start_hour or (v_shift_end_hour = 0 and v_shift_start_hour > 0) then
              v_shift_end_date := v_act_date + 1;
            else
              v_shift_end_date := v_act_date;
            end if;
            
            v_act_ends_at := pg_catalog.make_timestamptz(
              pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
              pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
              pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
              v_shift_end_hour,
              v_shift_end_min,
              0,
              'Asia/Jakarta'
            );
            
            if p_now >= v_act_ends_at then
              update public.worker_status
              set
                current_status = 'off',
                version = version + 1,
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
                lembur_started_at = null,
                updated_at = p_now
              where user_id = r.user_id;

              -- Auto-revert temp shift upon AUTO_OFF_SHIFT
              update public.worker_profiles
              set temp_shift = null,
                  temp_shift_until = null
              where user_id = r.user_id
                and temp_shift is not null;
              
              perform app_private.write_audit_log(
                'cron',
                'cron.auto_off_shift',
                'worker_status',
                r.user_id::text,
                jsonb_build_object('message', 'Shift ended. Automatically clocked off and temp shift reverted.'),
                r.user_id
              );
            end if;
          end;
        end if;
        
        -- 6. AUTO_ALPHA_EXPIRE
        if r.alpha_done = true and r.current_status = 'off' then
          declare
            v_exp1 timestamptz := app_private.get_shift_alpha_expiry(r.shift, v_attendance_date);
          begin
            if p_now >= v_exp1 then
              update public.worker_status
              set alpha_done = false, version = version + 1, updated_at = p_now
              where user_id = r.user_id;
              
              perform app_private.write_audit_log(
                'cron',
                'cron.auto_alpha_expire',
                'worker_status',
                r.user_id::text,
                jsonb_build_object('message', 'ALPHA display expired.'),
                r.user_id
              );
            end if;
          end;
        end if;
      end if;
    end if;
    
    -- 5. BREAK_LATE
    if r.current_status = 'break' and r.break_timer_running = true and r.break_started_at is not null and r.break_late_recorded = false then
      v_total_break_secs := r.break_accumulated_secs + pg_catalog.floor(pg_catalog.date_part('epoch', p_now - r.break_started_at))::integer;
      if v_total_break_secs > 3600 then
        v_record_break_late_seconds := v_total_break_secs - 3600;
        
        declare
          v_act_date date := coalesce(r.shift_active_date, (p_now at time zone 'Asia/Jakarta')::date);
          v_act_month date := pg_catalog.date_trunc('month', v_act_date::timestamp)::date;
        begin
          update public.worker_status
          set break_late_recorded = true, version = version + 1, updated_at = p_now
          where user_id = r.user_id;
          
          insert into public.worker_records (
            user_id,
            period_month,
            break_late_seconds,
            last_source,
            last_source_action,
            created_at,
            updated_at
          )
          values (
            r.user_id,
            v_act_month,
            v_record_break_late_seconds,
            'cron',
            'cron.break_late',
            p_now,
            p_now
          )
          on conflict (user_id, period_month) do update
          set 
            break_late_seconds = public.worker_records.break_late_seconds + excluded.break_late_seconds,
            last_source = 'cron',
            last_source_action = 'cron.break_late',
            updated_at = p_now;
            
          perform app_private.write_audit_log(
            'cron',
            'cron.break_late',
            'worker_status',
            r.user_id::text,
            jsonb_build_object('break_late_seconds', v_record_break_late_seconds, 'message', 'Worker break duration exceeded 1 hour limit.'),
            r.user_id
          );
        end;
      end if;
    end if;
    
    -- 7. SAKIT_TO_PENDING
    if r.current_status = 'sakit' and r.sakit_started_at is not null then
      if p_now >= r.sakit_started_at + interval '72 hours' then
        update public.worker_status
        set
          current_status = 'pending',
          pending_started_at = p_now,
          sakit_started_at = null,
          version = version + 1,
          updated_at = p_now
        where user_id = r.user_id;
        
        perform app_private.write_audit_log(
          'cron',
          'cron.sakit_to_pending',
          'worker_status',
          r.user_id::text,
          jsonb_build_object('message', 'Sick leave exceeded 72 hours. Status transitioned to PENDING.'),
          r.user_id
        );
      end if;
    end if;
  end loop;
end;
$$;
