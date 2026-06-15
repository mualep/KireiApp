create or replace function app_private.materialize_tracker_absence_days_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_expected_version bigint,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_tier text;
  v_target_deleted boolean;
  v_from_status text;
  v_from_version bigint;
  v_cuti_set_date date;
  v_sakit_started_at timestamptz;
  v_pending_started_at timestamptz;
  v_marker_date date;
  v_expected_source_action text;
  v_attendance_status text;
  v_is_flexible boolean;
  v_shift_start_hour integer;
  v_shift_start_min integer;
  v_shift_end_hour integer;
  v_shift_end_min integer;
  v_wib_timestamp timestamp;
  v_wib_date date;
  v_wib_minutes integer;
  v_start_minutes integer;
  v_end_minutes integer;
  v_current_attendance_date date;
  v_inserted_dates date[] := array[]::date[];
  v_skipped_existing_dates date[] := array[]::date[];
  v_skipped_canceled_dates date[] := array[]::date[];
  v_inserted_count integer := 0;
  v_cuti_stock_before integer;
  v_cuti_stock_after integer;
  v_cuti_stock_delta integer := 0;
  v_audit_id uuid;
begin
  if p_actor_user_id is null then
    raise exception 'tracker.unauthenticated' using errcode = '42501';
  end if;

  if p_target_user_id is null or p_expected_version is null or p_expected_version < 0 then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  select u.tier
  into v_actor_tier
  from public.users as u
  where u.id = p_actor_user_id
    and u.is_deleted = false;

  if v_actor_tier is null then
    raise exception 'tracker.unauthenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.users as u
    where u.id = p_actor_user_id
      and u.is_deleted = false
      and u.tier in ('owner', 'admin')
  ) then
    raise exception 'tracker.unauthorized' using errcode = '42501';
  end if;

  if v_actor_tier not in ('owner', 'admin') then
    raise exception 'tracker.unauthorized' using errcode = '42501';
  end if;

  select u.is_deleted
  into v_target_deleted
  from public.users as u
  where u.id = p_target_user_id;

  if v_target_deleted is distinct from false then
    raise exception 'tracker.invalid_target' using errcode = '22023';
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

  if v_from_status is null then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  if v_from_version <> p_expected_version then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  if v_from_status not in ('cuti', 'sakit', 'pending') then
    raise exception 'tracker.invalid_transition' using errcode = '23514';
  end if;

  v_expected_source_action := case v_from_status
    when 'cuti' then 'tracker.cuti'
    when 'sakit' then 'tracker.sakit'
    when 'pending' then 'tracker.izin'
  end;

  v_attendance_status := case v_from_status
    when 'cuti' then 'cuti'
    when 'sakit' then 'sakit'
    when 'pending' then 'pending'
  end;

  v_marker_date := case v_from_status
    when 'cuti' then v_cuti_set_date
    when 'sakit' then (v_sakit_started_at at time zone 'Asia/Jakarta')::date
    when 'pending' then (v_pending_started_at at time zone 'Asia/Jakarta')::date
  end;

  if v_marker_date is null then
    raise exception 'tracker.invalid_transition' using errcode = '23514';
  end if;

  select
    wp.is_flexible,
    wp.shift_start_hour,
    wp.shift_start_min,
    wp.shift_end_hour,
    wp.shift_end_min
  into
    v_is_flexible,
    v_shift_start_hour,
    v_shift_start_min,
    v_shift_end_hour,
    v_shift_end_min
  from public.worker_profiles as wp
  where wp.user_id = p_target_user_id
    and wp.show_card = true
  for update;

  if v_is_flexible is null then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  v_wib_timestamp := p_now at time zone 'Asia/Jakarta';
  v_wib_date := v_wib_timestamp::date;
  v_wib_minutes :=
    pg_catalog.date_part('hour', v_wib_timestamp)::integer * 60
    + pg_catalog.date_part('minute', v_wib_timestamp)::integer;

  if v_is_flexible
    or v_shift_start_hour is null
    or v_shift_start_min is null
    or v_shift_end_hour is null
    or v_shift_end_min is null
  then
    v_current_attendance_date := v_wib_date;
  else
    v_start_minutes := v_shift_start_hour * 60 + v_shift_start_min;
    v_end_minutes := v_shift_end_hour * 60 + v_shift_end_min;

    if v_start_minutes > v_end_minutes and v_wib_minutes < v_end_minutes then
      v_current_attendance_date := v_wib_date - 1;
    else
      v_current_attendance_date := v_wib_date;
    end if;
  end if;

  if v_current_attendance_date < v_marker_date then
    raise exception 'tracker.invalid_transition' using errcode = '23514';
  end if;

  perform 1
  from public.worker_attendance as wa
  where wa.user_id = p_target_user_id
    and wa.attendance_date between v_marker_date and v_current_attendance_date
  for update;

  select coalesce(pg_catalog.array_agg(wa.attendance_date order by wa.attendance_date), array[]::date[])
  into v_skipped_existing_dates
  from public.worker_attendance as wa
  where wa.user_id = p_target_user_id
    and wa.attendance_date between v_marker_date and v_current_attendance_date
    and wa.is_canceled = false;

  select coalesce(pg_catalog.array_agg(wa.attendance_date order by wa.attendance_date), array[]::date[])
  into v_skipped_canceled_dates
  from public.worker_attendance as wa
  where wa.user_id = p_target_user_id
    and wa.attendance_date between v_marker_date and v_current_attendance_date
    and wa.is_canceled = true;

  with candidate_dates as (
    select generate_series(v_marker_date, v_current_attendance_date, interval '1 day')::date as attendance_date
  ),
  missing_dates as (
    select cd.attendance_date
    from candidate_dates as cd
    where not exists (
      select 1
      from public.worker_attendance as existing
      where existing.user_id = p_target_user_id
        and existing.attendance_date = cd.attendance_date
    )
  ),
  inserted_rows as (
    insert into public.worker_attendance (
      user_id,
      attendance_date,
      status,
      source,
      source_action,
      created_at,
      updated_at
    )
    select
      p_target_user_id,
      md.attendance_date,
      v_attendance_status,
      'tracker',
      v_expected_source_action,
      p_now,
      p_now
    from missing_dates as md
    order by md.attendance_date
    on conflict on constraint worker_attendance_user_date_key do nothing
    returning attendance_date
  )
  select
    coalesce(pg_catalog.array_agg(attendance_date order by attendance_date), array[]::date[]),
    pg_catalog.count(*)::integer
  into v_inserted_dates, v_inserted_count
  from inserted_rows;

  if v_from_status = 'cuti' and v_inserted_count > 0 then
    select wp.cuti_stock
    into v_cuti_stock_before
    from public.worker_profiles as wp
    where wp.user_id = p_target_user_id
    for update;

    if coalesce(v_cuti_stock_before, 0) < v_inserted_count then
      raise exception 'tracker.cuti_stock_insufficient_for_range' using errcode = '23514';
    end if;

    update public.worker_profiles as wp
    set
      cuti_stock = cuti_stock - v_inserted_count,
      updated_at = p_now
    where wp.user_id = p_target_user_id
    returning wp.cuti_stock into v_cuti_stock_after;


    v_cuti_stock_delta := -v_inserted_count;
  elsif v_from_status = 'cuti' then
    select wp.cuti_stock
    into v_cuti_stock_after
    from public.worker_profiles as wp
    where wp.user_id = p_target_user_id;
  end if;

  if v_inserted_count > 0 then
    if v_from_status = 'sakit' then
      insert into public.worker_records (
        user_id,
        period_month,
        sakit_days,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      select
        p_target_user_id,
        pg_catalog.date_trunc('month', inserted_date::timestamp)::date,
        pg_catalog.count(*)::integer,
        'tracker',
        'tracker.materialize_sakit',
        p_now,
        p_now
      from pg_catalog.unnest(v_inserted_dates) as inserted_date
      group by pg_catalog.date_trunc('month', inserted_date::timestamp)::date
      on conflict (user_id, period_month) do update
      set
        sakit_days = public.worker_records.sakit_days + excluded.sakit_days,
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    elsif v_from_status = 'pending' then
      insert into public.worker_records (
        user_id,
        period_month,
        pending_days,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      select
        p_target_user_id,
        pg_catalog.date_trunc('month', inserted_date::timestamp)::date,
        pg_catalog.count(*)::integer,
        'tracker',
        'tracker.materialize_izin',
        p_now,
        p_now
      from pg_catalog.unnest(v_inserted_dates) as inserted_date
      group by pg_catalog.date_trunc('month', inserted_date::timestamp)::date
      on conflict (user_id, period_month) do update
      set
        pending_days = public.worker_records.pending_days + excluded.pending_days,
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    elsif v_from_status = 'cuti' then
      insert into public.worker_records (
        user_id,
        period_month,
        cuti_stock_snapshot,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      select
        p_target_user_id,
        pg_catalog.date_trunc('month', inserted_date::timestamp)::date,
        v_cuti_stock_after,
        'tracker',
        'tracker.materialize_cuti',
        p_now,
        p_now
      from pg_catalog.unnest(v_inserted_dates) as inserted_date
      group by pg_catalog.date_trunc('month', inserted_date::timestamp)::date
      on conflict (user_id, period_month) do update
      set
        cuti_stock_snapshot = coalesce(excluded.cuti_stock_snapshot, public.worker_records.cuti_stock_snapshot),
        last_source = excluded.last_source,
        last_source_action = excluded.last_source_action,
        updated_at = excluded.updated_at;
    end if;
  end if;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    'tracker.materialize_absence_days',
    'worker_status',
    p_target_user_id::text,
    pg_catalog.jsonb_build_object(
      'target_user_id', p_target_user_id,
      'from_status', v_from_status,
      'from_version', v_from_version,
      'marker_date', v_marker_date,
      'current_attendance_date', v_current_attendance_date,
      'inserted_count', v_inserted_count,
      'inserted_dates', v_inserted_dates,
      'skipped_existing_dates', v_skipped_existing_dates,
      'skipped_canceled_dates', v_skipped_canceled_dates,
      'cuti_stock_delta', v_cuti_stock_delta,
      'cuti_stock_after', v_cuti_stock_after
    ),
    p_target_user_id
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'target_user_id', p_target_user_id,
    'status', v_from_status,
    'inserted_count', v_inserted_count,
    'inserted_dates', v_inserted_dates,
    'skipped_existing_dates', v_skipped_existing_dates,
    'skipped_canceled_dates', v_skipped_canceled_dates,
    'audit_id', v_audit_id
  );
exception
  when unique_violation then
    raise exception 'tracker.materialization_conflict' using errcode = '23505';
end;
$$;

create or replace function public.materialize_tracker_absence_days(
  p_target_user_id uuid,
  p_expected_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'tracker.unauthenticated' using errcode = '42501';
  end if;

  return app_private.materialize_tracker_absence_days_impl(
    v_actor_user_id,
    p_target_user_id,
    p_expected_version,
    pg_catalog.clock_timestamp()
  );
end;
$$;

revoke execute on function public.materialize_tracker_absence_days(uuid, bigint) from public;
revoke execute on function public.materialize_tracker_absence_days(uuid, bigint) from anon;
grant execute on function public.materialize_tracker_absence_days(uuid, bigint) to authenticated;

revoke execute on function app_private.materialize_tracker_absence_days_impl(uuid, uuid, bigint, timestamptz) from public;
revoke execute on function app_private.materialize_tracker_absence_days_impl(uuid, uuid, bigint, timestamptz) from anon;
revoke execute on function app_private.materialize_tracker_absence_days_impl(uuid, uuid, bigint, timestamptz) from authenticated;
