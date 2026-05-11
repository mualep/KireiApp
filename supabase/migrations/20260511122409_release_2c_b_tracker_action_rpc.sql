-- R2C-B-02D tracker action RPC status transition layer.
-- Daily outcome, monthly aggregate, leave stock, and audit side effects remain deferred.

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
  v_shift_label text;
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
begin
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
    ws.break_accumulated_secs
    into
      v_from_status,
      v_from_version,
      v_alpha_done,
      v_shift_active_date,
      v_break_started_at,
      v_break_timer_running,
      v_break_accumulated_secs
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
  v_current_wib_minutes :=
    (pg_catalog.date_part('hour', v_wib_timestamp)::integer * 60)
    + pg_catalog.date_part('minute', v_wib_timestamp)::integer;

  if v_is_flexible then
    v_attendance_date := v_wib_date;
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

    if v_shift_start_minutes > v_shift_end_minutes
      and v_current_wib_minutes < v_shift_end_minutes
    then
      v_attendance_date := v_wib_date - 1;
    else
      v_attendance_date := v_wib_date;
    end if;

    v_shift_end_date := v_attendance_date;

    if v_shift_end_minutes <= v_shift_start_minutes then
      v_shift_end_date := v_attendance_date + 1;
    end if;

    v_shift_starts_at := pg_catalog.make_timestamptz(
      pg_catalog.date_part('year', v_attendance_date::timestamp)::integer,
      pg_catalog.date_part('month', v_attendance_date::timestamp)::integer,
      pg_catalog.date_part('day', v_attendance_date::timestamp)::integer,
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
    v_work_late_seconds_delta := pg_catalog.greatest(
      0,
      pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_grace_at))::integer
    );
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

  if v_action = 'START' then
    if not (v_from_status = 'off' and v_display_status_before in ('OFF', 'LATE')) then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
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
      break_timer_running = true
    where ws.user_id = p_target_user_id
    returning ws.current_status, ws.version
      into v_to_status, v_to_version;
  elsif v_action = 'LANJUT' then
    if v_from_status <> 'break' then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    if v_break_timer_running = true and v_break_started_at is not null then
      v_break_accumulated_secs := v_break_accumulated_secs + pg_catalog.greatest(
        0,
        pg_catalog.floor(pg_catalog.date_part('epoch', p_now - v_break_started_at))::integer
      );
    end if;

    update public.worker_status as ws
    set
      current_status = 'on',
      version = v_from_version + 1,
      break_accumulated_secs = v_break_accumulated_secs,
      break_started_at = null,
      break_timer_running = false
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
  else
    if not (v_from_status = 'off' and v_display_status_before in ('OFF', 'LATE')) then
      raise exception 'tracker.invalid_transition' using errcode = '22023';
    end if;

    raise exception 'tracker.action_deferred' using errcode = '0A000';
  end if;

  if v_to_version is distinct from v_from_version + 1 then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'action', v_action,
    'target_user_id', p_target_user_id,
    'from_status', v_from_status,
    'to_status', v_to_status,
    'from_version', v_from_version,
    'to_version', v_to_version,
    'attendance_date', v_attendance_date,
    'period_month', v_period_month,
    'display_status_before', v_display_status_before,
    'work_late_seconds_delta', v_work_late_seconds_delta
  );
end;
$$;

comment on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz)
is 'Private SECURITY DEFINER tracker action implementation. R2C-B-02D updates status-only actions and defers daily outcome side effects.';

revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated;

create or replace function public.apply_tracker_action(
  p_target_user_id uuid,
  p_action text,
  p_expected_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_tier text;
begin
  if v_actor_id is null then
    raise exception 'tracker.unauthenticated' using errcode = '42501';
  end if;

  select u.tier
    into v_actor_tier
  from public.users as u
  where u.id = v_actor_id
    and u.is_deleted = false
    and u.tier in ('owner', 'admin')
  limit 1;

  if v_actor_tier is null then
    raise exception 'tracker.unauthorized' using errcode = '42501';
  end if;

  return app_private.apply_tracker_action_impl(
    v_actor_id,
    p_target_user_id,
    p_action,
    p_expected_version,
    pg_catalog.clock_timestamp()
  );
end;
$$;

comment on function public.apply_tracker_action(uuid, text, bigint)
is 'Authenticated RPC entrypoint for tracker action status transitions. Delegates to the private implementation after actor authorization.';

revoke execute on function public.apply_tracker_action(uuid, text, bigint) from public;
revoke execute on function public.apply_tracker_action(uuid, text, bigint) from anon;
grant execute on function public.apply_tracker_action(uuid, text, bigint) to authenticated;
