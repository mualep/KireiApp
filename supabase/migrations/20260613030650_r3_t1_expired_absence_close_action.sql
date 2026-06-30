create or replace function app_private.apply_tracker_absence_close_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_expected_version bigint,
  p_attendance_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_tier text;
  v_attendance_date date;
  v_attendance_is_canceled boolean;
  v_attendance_source text;
  v_attendance_source_action text;
  v_attendance_status text;
  v_audit_id uuid;
  v_cuti_set_date date;
  v_expected_source_action text;
  v_from_status text;
  v_from_version bigint;
  v_gid text := null;
  v_is_flexible boolean;
  v_pending_started_at timestamptz;
  v_sakit_started_at timestamptz;
  v_shift_end_date date;
  v_shift_end_hour smallint;
  v_shift_end_min smallint;
  v_shift_ends_at timestamptz;
  v_shift_start_hour smallint;
  v_shift_start_min smallint;
  v_status_marker_date date;
  v_to_version bigint;
begin
  if p_actor_user_id is null then
    raise exception 'tracker.unauthenticated' using errcode = '28000';
  end if;

  if p_target_user_id is null
    or p_expected_version is null
    or p_expected_version < 0
  then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  select u.tier
    into v_actor_tier
  from public.users as u
  where u.id = p_actor_user_id
    and u.is_deleted = false
    and u.tier in ('owner', 'admin');

  if not found then
    raise exception 'tracker.unauthorized' using errcode = '42501';
  end if;

  select
    ws.current_status,
    ws.version,
    ws.cuti_set_date,
    ws.sakit_started_at,
    ws.pending_started_at
    into
      v_from_status,
      v_from_version,
      v_cuti_set_date,
      v_sakit_started_at,
      v_pending_started_at
  from public.worker_status as ws
  where ws.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  if v_from_version <> p_expected_version then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  if v_from_status not in ('cuti', 'sakit', 'pending') then
    raise exception 'tracker.invalid_transition' using errcode = '22023';
  end if;

  v_expected_source_action := case v_from_status
    when 'cuti' then 'tracker.cuti'
    when 'sakit' then 'tracker.sakit'
    when 'pending' then 'tracker.izin'
  end;

  if p_attendance_id is not null then
    select
      wa.attendance_date,
      wa.status,
      wa.source,
      wa.source_action,
      wa.is_canceled
      into
        v_attendance_date,
        v_attendance_status,
        v_attendance_source,
        v_attendance_source_action,
        v_attendance_is_canceled
    from public.worker_attendance as wa
    where wa.id = p_attendance_id
      and wa.user_id = p_target_user_id
    for update;

    if not found
      or v_attendance_is_canceled
      or v_attendance_status <> v_from_status
      or v_attendance_source <> 'tracker'
      or v_attendance_source_action <> v_expected_source_action
    then
      raise exception 'tracker.attendance_missing' using errcode = '22023';
    end if;
  end if;

  v_status_marker_date := case v_from_status
    when 'cuti' then v_cuti_set_date
    when 'sakit' then (v_sakit_started_at at time zone 'Asia/Jakarta')::date
    when 'pending' then (v_pending_started_at at time zone 'Asia/Jakarta')::date
  end;
  v_attendance_date := coalesce(v_attendance_date, v_status_marker_date);

  if v_attendance_date is null then
    raise exception 'tracker.attendance_missing' using errcode = '22023';
  end if;

  select
    wp.shift_start_hour,
    wp.shift_start_min,
    wp.shift_end_hour,
    wp.shift_end_min,
    wp.is_flexible
    into
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

  if v_is_flexible then
    if (p_now at time zone 'Asia/Jakarta')::date = v_attendance_date then
      raise exception 'tracker.absence_close_not_expired' using errcode = '22023';
    end if;
  else
    if v_shift_start_hour is null
      or v_shift_start_min is null
      or v_shift_end_hour is null
      or v_shift_end_min is null
    then
      raise exception 'tracker.invalid_target' using errcode = '22023';
    end if;

    v_shift_end_date := v_attendance_date;

    if (v_shift_end_hour::integer * 60) + v_shift_end_min::integer
      <= (v_shift_start_hour::integer * 60) + v_shift_start_min::integer
    then
      v_shift_end_date := v_attendance_date + 1;
    end if;

    v_shift_ends_at := pg_catalog.make_timestamptz(
      pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
      pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
      pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
      v_shift_end_hour::integer,
      v_shift_end_min::integer,
      0,
      'Asia/Jakarta'
    );

    if p_now < v_shift_ends_at then
      raise exception 'tracker.absence_close_not_expired' using errcode = '22023';
    end if;
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
    lembur_started_at = null,
    updated_at = p_now
  where ws.user_id = p_target_user_id
  returning ws.version into v_to_version;

  if v_to_version is distinct from v_from_version + 1 then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    'tracker.close_expired_absence',
    'worker_status',
    p_target_user_id::text,
    pg_catalog.jsonb_build_object(
      'attendance_id', p_attendance_id,
      'target_user_id', p_target_user_id,
      'gid', v_gid,
      'attendance_date', v_attendance_date,
      'status_marker_date', v_status_marker_date,
      'from_status', v_from_status,
      'to_status', 'off',
      'from_version', v_from_version,
      'to_version', v_to_version
    ),
    p_target_user_id
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'action', 'CLOSE_EXPIRED_ABSENCE',
    'audit_id', v_audit_id,
    'attendance_id', p_attendance_id,
    'target_user_id', p_target_user_id,
    'from_status', v_from_status,
    'to_status', 'off',
    'from_version', v_from_version,
    'to_version', v_to_version
  );
end;
$$;

create or replace function public.apply_tracker_absence_close(
  p_target_user_id uuid,
  p_expected_version bigint,
  p_attendance_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception 'tracker.unauthenticated' using errcode = '28000';
  end if;

  return app_private.apply_tracker_absence_close_impl(
    v_actor_user_id,
    p_target_user_id,
    p_expected_version,
    p_attendance_id,
    pg_catalog.clock_timestamp()
  );
end;
$$;

revoke execute on function public.apply_tracker_absence_close(uuid, bigint, uuid) from public;
revoke execute on function public.apply_tracker_absence_close(uuid, bigint, uuid) from anon;
grant execute on function public.apply_tracker_absence_close(uuid, bigint, uuid) to authenticated;

revoke execute on function app_private.apply_tracker_absence_close_impl(uuid, uuid, bigint, uuid, timestamptz) from public;
revoke execute on function app_private.apply_tracker_absence_close_impl(uuid, uuid, bigint, uuid, timestamptz) from anon;
revoke execute on function app_private.apply_tracker_absence_close_impl(uuid, uuid, bigint, uuid, timestamptz) from authenticated;
