-- Migration: Early Check-In Forwarder for next-day START actions

-- Redefine apply_tracker_action_impl
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
  v_break_started_at timestamptz;
  v_break_timer_running boolean;
  v_break_accumulated_secs integer;
  v_break_accumulated_secs_before integer;
  v_break_late_recorded boolean;
  v_shift_label text;
  v_gid text := null; -- gid is dropped, set to null
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
    'SAKIT'
  ) then
    raise exception 'tracker.invalid_action' using errcode = '22023';
  end if;

  if p_target_user_id is null
    or p_now is null
    or p_expected_version is null
    or p_expected_version < 0
  then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  select true
    into v_target_exists
  from public.users as tu
  where tu.id = p_target_user_id
    and tu.is_deleted = false
  limit 1;

  if not coalesce(v_target_exists, false) then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  select
    ws.current_status,
    ws.version,
    ws.alpha_done,
    ws.shift_active_date,
    ws.break_started_at,
    ws.break_timer_running,
    ws.break_accumulated_secs,
    ws.break_late_recorded
    into
      v_from_status,
      v_from_version,
      v_alpha_done,
      v_shift_active_date,
      v_break_started_at,
      v_break_timer_running,
      v_break_accumulated_secs,
      v_break_late_recorded
  from public.worker_status as ws
  where ws.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  select
    wp.shift,
    wp.shift_start_hour,
    wp.shift_start_min,
    wp.shift_end_hour,
    wp.shift_end_min,
    wp.is_flexible
    into
      v_shift_label,
      v_shift_start_hour,
      v_shift_start_min,
      v_shift_end_hour,
      v_shift_end_min,
      v_is_flexible
  from public.worker_profiles as wp
  where wp.user_id = p_target_user_id;

  if not found then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  if v_from_version <> p_expected_version then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  v_wib_timestamp := p_now at time zone 'Asia/Jakarta';
  v_wib_date := v_wib_timestamp::date;
  
  -- Calculate v_attendance_date using absolute hour check in WIB timezone
  if pg_catalog.date_part('hour', v_wib_timestamp)::integer < 6 then
    v_attendance_date := v_wib_date - 1;
  else
    v_attendance_date := v_wib_date;
  end if;

  -- [EARLY CHECK-IN FORWARDER]
  -- If action is START, and we are in the early morning hours (before 06:00 AM WIB),
  -- and an attendance row already exists for v_attendance_date, 
  -- we assume this is an early check-in for the NEXT operational day.
  if v_action = 'START' and pg_catalog.date_part('hour', v_wib_timestamp)::integer < 6 then
    if exists (
      select 1 from public.worker_attendance 
      where user_id = p_target_user_id 
        and attendance_date = v_attendance_date
        and is_canceled = false
    ) then
      -- Shift the attendance date forward by 1 day
      v_attendance_date := v_attendance_date + 1;
      
      -- Reset local v_alpha_done so the worker is not blocked by yesterday's ALPHA flag
      v_alpha_done := false;
    end if;
  end if;

  if v_is_flexible then
    -- No shift bounds for flexible workers
  else
    if v_shift_start_hour is null
      or v_shift_start_min is null
      or v_shift_end_hour is null
      or v_shift_end_min is null
    then
      raise exception 'tracker.invalid_target' using errcode = '22023';
    end if;

    v_shift_start_minutes := (v_shift_start_hour::integer * 60) + v_shift_start_min::integer;
    v_shift_end_minutes := (v_shift_end_hour::integer * 60) + v_shift_end_min::integer;

    -- Reconstruct the calendar start date (v_cycle_date) of the shift cycle
    declare
      v_cycle_date date;
    begin
      if v_shift_start_hour = 0 then
        -- Shift F: starts and ends the day after v_attendance_date
        v_cycle_date := v_attendance_date + 1;
        v_shift_end_date := v_attendance_date + 1;
      elsif v_shift_end_hour < v_shift_start_hour or (v_shift_end_hour = 0 and v_shift_start_hour > 0) then
        -- Cross Midnight (e.g. Shift D, E, 3)
        v_cycle_date := v_attendance_date;
        v_shift_end_date := v_attendance_date + 1;
      else
        -- Normal Day Shifts
        v_cycle_date := v_attendance_date;
        v_shift_end_date := v_attendance_date;
      end if;

      v_shift_starts_at := pg_catalog.make_timestamptz(
        pg_catalog.date_part('year', v_cycle_date::timestamp)::integer,
        pg_catalog.date_part('month', v_cycle_date::timestamp)::integer,
        pg_catalog.date_part('day', v_cycle_date::timestamp)::integer,
        v_shift_start_hour::integer,
        v_shift_start_min::integer,
        0,
        'Asia/Jakarta'
      );
      
      v_shift_ends_at := pg_catalog.make_timestamptz(
        pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
        pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
        pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
        v_shift_end_hour::integer,
        v_shift_end_min::integer,
        0,
        'Asia/Jakarta'
      );
      v_grace_at := v_shift_starts_at + pg_catalog.make_interval(mins => 10);
    end;
  end if;

  v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;

  if v_alpha_done = true then
    v_display_status_before := 'ALPHA';
  elsif not v_is_flexible
    and v_from_status = 'off'
    and p_now >= v_grace_at
    and p_now < v_shift_ends_at
  then
    v_display_status_before := 'LATE';
    v_work_late_seconds_delta := case
      when pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer > 0
        then pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer
      else 0
    end;
  else
    v_display_status_before := case v_from_status
      when 'off' then 'OFF'
      when 'on' then 'ON'
      when 'break' then 'BREAK'
      when 'cuti' then 'CUTI'
      when 'sakit' then 'SAKIT'
      when 'pending' then 'PENDING'
      when 'lembur' then 'LEMBUR'
    end;
  end if;

  if v_display_status_before = 'ALPHA' then
    raise exception 'tracker.alpha_rejected' using errcode = '22023';
  end if;

  v_audit_action := case
    when v_action = 'START' and v_display_status_before = 'LATE' then 'tracker.start_late'
    when v_action = 'START' then 'tracker.start'
    when v_action = 'ISTIRAHAT' then 'tracker.break_start'
    when v_action = 'LANJUT' then 'tracker.break_end'
    when v_action = 'SELESAI' then 'tracker.finish'
    when v_action = 'CUTI' then 'tracker.cuti'
    when v_action = 'IZIN' then 'tracker.izin'
    when v_action = 'SAKIT' then 'tracker.sakit'
  end;

  if v_action in ('START', 'CUTI', 'IZIN', 'SAKIT') then
    if not (v_from_status = 'off' and v_display_status_before in ('OFF', 'LATE')) then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    v_attendance_status := case v_action
      when 'START' then 'hadir'
      when 'CUTI' then 'cuti'
      when 'IZIN' then 'pending'
      when 'SAKIT' then 'sakit'
    end;
    v_source_action := v_audit_action;

    select wa.status, wa.is_canceled
      into v_existing_attendance_status, v_existing_attendance_canceled
    from public.worker_attendance as wa
    where wa.user_id = p_target_user_id
      and wa.attendance_date = v_attendance_date
    for update;

    if v_existing_attendance_status is not null and not coalesce(v_existing_attendance_canceled, false) then
      if v_action = 'START' and v_existing_attendance_status = 'hadir' then
        v_attendance_reused := true;
        v_work_late_seconds_delta := 0;
      else
        raise exception 'tracker.attendance_conflict' using errcode = '23505';
      end if;
    end if;
  end if;

  if v_action = 'START' then
    v_attendance_id := null;

    if not v_attendance_reused then
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
      on conflict on constraint worker_attendance_user_date_key do update
      set
        status = excluded.status,
        source = excluded.source,
        source_action = excluded.source_action,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        is_canceled = false
      where public.worker_attendance.is_canceled = true
      returning id into v_attendance_id;

      if v_attendance_id is null then
        v_existing_attendance_status := null;
        v_existing_attendance_canceled := null;

        select wa.status, wa.is_canceled
          into v_existing_attendance_status, v_existing_attendance_canceled
        from public.worker_attendance as wa
        where wa.user_id = p_target_user_id
          and wa.attendance_date = v_attendance_date
        for update;

        if v_existing_attendance_status = 'hadir' and not coalesce(v_existing_attendance_canceled, false) then
          v_attendance_reused := true;
          v_work_late_seconds_delta := 0;
        else
          raise exception 'tracker.attendance_conflict' using errcode = '23505';
        end if;
      end if;
    end if;

    if v_display_status_before = 'LATE' and not v_attendance_reused then
      v_record_work_late_seconds := v_work_late_seconds_delta;
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
  elsif v_action = 'CUTI' then
    select cp.cuti_stock
      into v_cuti_stock_before
    from public.worker_profiles as cp
    where cp.user_id = p_target_user_id
    for update;

    if not found then
      raise exception 'tracker.invalid_target' using errcode = '22023';
    end if;

    if v_cuti_stock_before <= 0 then
      raise exception 'tracker.cuti_stock_exhausted' using errcode = '23514';
    end if;

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
      p_target_user_id,
      v_attendance_date,
      v_attendance_status,
      'tracker',
      v_source_action,
      p_now,
      p_now
    )
    on conflict on constraint worker_attendance_user_date_key do update
    set
      status = excluded.status,
      source = excluded.source,
      source_action = excluded.source_action,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      is_canceled = false
    where public.worker_attendance.is_canceled = true
    returning id into v_attendance_id;

    if v_attendance_id is null then
      raise exception 'tracker.attendance_conflict' using errcode = '23505';
    end if;

    update public.worker_profiles as wp
    set cuti_stock = cuti_stock - 1
    where wp.user_id = p_target_user_id
      and wp.cuti_stock > 0
    returning wp.cuti_stock into v_cuti_stock_after;

    if not found then
      raise exception 'tracker.cuti_stock_exhausted' using errcode = '23514';
    end if;

    v_record_cuti_stock_snapshot := v_cuti_stock_after;
    v_cuti_stock_delta := -1;

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

    update public.worker_status as ws
    set
      current_status = 'cuti',
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
      cuti_set_date = v_attendance_date,
      lembur_started_at = null
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;
  elsif v_action = 'IZIN' then
    v_attendance_id := null;
    v_record_pending_days := 1;
    v_record_deltas := pg_catalog.jsonb_build_object('pending_days', v_record_pending_days);

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
    on conflict on constraint worker_attendance_user_date_key do update
    set
      status = excluded.status,
      source = excluded.source,
      source_action = excluded.source_action,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      is_canceled = false
    where public.worker_attendance.is_canceled = true
    returning id into v_attendance_id;

    if v_attendance_id is null then
      raise exception 'tracker.attendance_conflict' using errcode = '23505';
    end if;

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

    update public.worker_status as ws
    set
      current_status = 'pending',
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
      pending_started_at = p_now,
      cuti_set_date = null,
      lembur_started_at = null
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;
  elsif v_action = 'SAKIT' then
    v_attendance_id := null;
    v_record_sakit_days := 1;
    v_record_deltas := pg_catalog.jsonb_build_object('sakit_days', v_record_sakit_days);

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
    on conflict on constraint worker_attendance_user_date_key do update
    set
      status = excluded.status,
      source = excluded.source,
      source_action = excluded.source_action,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      is_canceled = false
    where public.worker_attendance.is_canceled = true
    returning id into v_attendance_id;

    if v_attendance_id is null then
      raise exception 'tracker.attendance_conflict' using errcode = '23505';
    end if;

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

    update public.worker_status as ws
    set
      current_status = 'sakit',
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
      sakit_started_at = p_now,
      pending_started_at = null,
      cuti_set_date = null,
      lembur_started_at = null
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;
  end if;

  if v_to_version is distinct from v_from_version + 1 then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    v_audit_action,
    'worker_status',
    p_target_user_id::text,
    pg_catalog.jsonb_strip_nulls(
      pg_catalog.jsonb_build_object(
        'action', v_audit_action,
        'target_user_id', p_target_user_id,
        'gid', v_gid,
        'attendance_date', v_attendance_date,
        'period_month', v_period_month,
        'from_status', v_from_status,
        'to_status', v_to_status,
        'display_status_before', v_display_status_before,
        'from_version', v_from_version,
        'to_version', v_to_version,
        'attendance_status', v_attendance_status,
        'attendance_reused', case when v_attendance_reused then true end,
        'record_deltas', v_record_deltas,
        'cuti_stock_delta', v_cuti_stock_delta,
        'cuti_stock_after', v_cuti_stock_after,
        'cuti_stock_snapshot_after', v_record_cuti_stock_snapshot
      )
    ),
    p_target_user_id
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'action', v_action,
    'audit_id', v_audit_id,
    'target_user_id', p_target_user_id,
    'from_status', v_from_status,
    'to_status', v_to_status,
    'from_version', v_from_version,
    'to_version', v_to_version,
    'attendance_date', v_attendance_date,
    'period_month', v_period_month,
    'display_status_before', v_display_status_before,
    'work_late_seconds_delta', v_work_late_seconds_delta,
    'attendance_status', v_attendance_status,
    'attendance_reused', v_attendance_reused,
    'source_action', v_source_action,
    'cuti_stock_after', v_cuti_stock_after
  );
end;
$$;

revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated;
