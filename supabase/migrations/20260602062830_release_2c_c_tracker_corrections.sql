-- R2C-C tracker-origin CUTI, SAKIT, and IZIN cancellation.

alter table public.worker_attendance
  add column if not exists is_canceled boolean not null default false;

comment on column public.worker_attendance.is_canceled is
  'Marks the mutable daily attendance slot inactive after an audited tracker correction. History remains in worker_attendance_corrections.';

create table if not exists public.worker_attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.worker_attendance(id),
  target_user_id uuid not null references public.users(id),
  actor_user_id uuid not null references public.users(id),
  attendance_date date not null,
  correction_action text not null,
  before_status text not null,
  before_source text not null,
  before_source_action text not null,
  pending_days_delta integer not null default 0,
  sakit_days_delta integer not null default 0,
  cuti_stock_delta integer not null default 0,
  cuti_stock_before smallint,
  cuti_stock_after smallint,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint worker_attendance_corrections_action_check check (
    correction_action in ('CANCEL_CUTI', 'CANCEL_SAKIT', 'CANCEL_IZIN')
  ),
  constraint worker_attendance_corrections_reason_check check (
    char_length(btrim(reason)) between 1 and 500
  )
);

comment on table public.worker_attendance_corrections is
  'Immutable tracker-origin absence correction ledger. Daily attendance remains one mutable slot per worker/date.';

create index if not exists worker_attendance_corrections_target_date_idx
  on public.worker_attendance_corrections (target_user_id, attendance_date desc);

alter table public.worker_attendance_corrections enable row level security;

revoke all on public.worker_attendance_corrections from anon, authenticated;
grant select on public.worker_attendance_corrections to authenticated;

create policy worker_attendance_corrections_select_admin_only
on public.worker_attendance_corrections
for select
to authenticated
using ((select app_private.is_admin_or_owner()));

-- Keep the stable public tracker action signature. Patch the installed private
-- implementation so a canceled daily slot can be revived without allowing a
-- second active row for the same worker/date.
do $migration$
declare
  v_definition text;
  v_before text;
begin
  v_definition := pg_catalog.pg_get_functiondef(
    'app_private.apply_tracker_action_impl(uuid,uuid,text,bigint,timestamptz)'::regprocedure
  );

  v_before := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    '  v_existing_attendance_status text;',
    '  v_existing_attendance_status text;
  v_existing_attendance_canceled boolean;'
  );
  if v_definition = v_before then
    raise exception 'R2C-C could not add canceled attendance state to tracker implementation';
  end if;

  v_before := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    '    select wa.status
      into v_existing_attendance_status',
    '    select wa.status, wa.is_canceled
      into v_existing_attendance_status, v_existing_attendance_canceled'
  );
  if v_definition = v_before then
    raise exception 'R2C-C could not read canceled attendance state in tracker implementation';
  end if;

  v_before := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    '    if v_existing_attendance_status is not null then
      if v_action = ''START'' and v_existing_attendance_status = ''hadir'' then',
    '    if v_existing_attendance_status is not null and not v_existing_attendance_canceled then
      if v_action = ''START'' and v_existing_attendance_status = ''hadir'' then'
  );
  if v_definition = v_before then
    raise exception 'R2C-C could not preserve active attendance conflict behavior';
  end if;

  v_before := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    '      on conflict on constraint worker_attendance_user_date_key do nothing',
    '      on conflict on constraint worker_attendance_user_date_key do update
      set
        status = excluded.status,
        source = excluded.source,
        source_action = excluded.source_action,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        is_canceled = false
      where public.worker_attendance.is_canceled = true'
  );
  if v_definition = v_before then
    raise exception 'R2C-C could not add canceled attendance slot revival';
  end if;

  v_before := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    '    on conflict on constraint worker_attendance_user_date_key do nothing',
    '    on conflict on constraint worker_attendance_user_date_key do update
    set
      status = excluded.status,
      source = excluded.source,
      source_action = excluded.source_action,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      is_canceled = false
    where public.worker_attendance.is_canceled = true'
  );
  if v_definition = v_before then
    raise exception 'R2C-C could not add canceled attendance slot revival for tracker absence actions';
  end if;

  execute v_definition;
end;
$migration$;

revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated;

create or replace function app_private.apply_tracker_correction_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_correction_action text,
  p_expected_version bigint,
  p_attendance_id uuid,
  p_reason text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_tier text;
  v_action text := nullif(pg_catalog.btrim(p_correction_action), '');
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_from_status text;
  v_from_version bigint;
  v_expected_status text;
  v_expected_source_action text;
  v_attendance_date date;
  v_attendance_status text;
  v_attendance_source text;
  v_attendance_source_action text;
  v_attendance_is_canceled boolean;
  v_period_month date;
  v_shift_start_hour smallint;
  v_shift_start_min smallint;
  v_shift_end_hour smallint;
  v_shift_end_min smallint;
  v_is_flexible boolean;
  v_shift_end_date date;
  v_shift_ends_at timestamptz;
  v_pending_days_delta integer := 0;
  v_sakit_days_delta integer := 0;
  v_cuti_stock_delta integer := 0;
  v_cuti_stock_before smallint;
  v_cuti_stock_after smallint;
  v_correction_id uuid;
  v_audit_id uuid;
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

  if v_action not in ('CANCEL_CUTI', 'CANCEL_SAKIT', 'CANCEL_IZIN') then
    raise exception 'tracker.invalid_correction_action' using errcode = '22023';
  end if;

  if p_target_user_id is null
    or p_attendance_id is null
    or p_now is null
    or p_expected_version is null
    or p_expected_version < 0
    or v_reason is null
    or pg_catalog.char_length(v_reason) > 500
  then
    raise exception 'tracker.invalid_correction_input' using errcode = '22023';
  end if;

  select
    case v_action
      when 'CANCEL_CUTI' then 'cuti'
      when 'CANCEL_SAKIT' then 'sakit'
      when 'CANCEL_IZIN' then 'pending'
    end,
    case v_action
      when 'CANCEL_CUTI' then 'tracker.cuti'
      when 'CANCEL_SAKIT' then 'tracker.sakit'
      when 'CANCEL_IZIN' then 'tracker.izin'
    end
    into v_expected_status, v_expected_source_action;

  select ws.current_status, ws.version
    into v_from_status, v_from_version
  from public.worker_status as ws
  where ws.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  if v_from_version <> p_expected_version then
    raise exception 'tracker.version_conflict' using errcode = '40001';
  end if;

  if v_from_status <> v_expected_status then
    raise exception 'tracker.invalid_transition' using errcode = '22023';
  end if;

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
    or v_attendance_status <> v_expected_status
    or v_attendance_source <> 'tracker'
    or v_attendance_source_action <> v_expected_source_action
  then
    raise exception 'tracker.attendance_missing' using errcode = '22023';
  end if;

  v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;

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
    if (p_now at time zone 'Asia/Jakarta')::date <> v_attendance_date then
      raise exception 'tracker.correction_expired' using errcode = '22023';
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

    if p_now >= v_shift_ends_at then
      raise exception 'tracker.correction_expired' using errcode = '22023';
    end if;
  end if;

  if v_action = 'CANCEL_CUTI' then
    select wp.cuti_stock
      into v_cuti_stock_before
    from public.worker_profiles as wp
    where wp.user_id = p_target_user_id
    for update;

    if not found then
      raise exception 'tracker.invalid_target' using errcode = '22023';
    end if;

    update public.worker_profiles as wp
    set cuti_stock = wp.cuti_stock + 1
    where wp.user_id = p_target_user_id
    returning wp.cuti_stock into v_cuti_stock_after;

    v_cuti_stock_delta := 1;

    update public.worker_records as wr
    set
      cuti_stock_snapshot = v_cuti_stock_after,
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_cuti',
      updated_at = p_now
    where wr.user_id = p_target_user_id
      and wr.period_month = v_period_month;
  elsif v_action = 'CANCEL_SAKIT' then
    v_sakit_days_delta := -1;

    update public.worker_records as wr
    set
      sakit_days = wr.sakit_days - 1,
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_sakit',
      updated_at = p_now
    where wr.user_id = p_target_user_id
      and wr.period_month = v_period_month
      and wr.sakit_days > 0;
  else
    v_pending_days_delta := -1;

    update public.worker_records as wr
    set
      pending_days = wr.pending_days - 1,
      last_source = 'tracker',
      last_source_action = 'tracker.cancel_izin',
      updated_at = p_now
    where wr.user_id = p_target_user_id
      and wr.period_month = v_period_month
      and wr.pending_days > 0;
  end if;

  if not found then
    raise exception 'tracker.records_missing' using errcode = '22023';
  end if;

  update public.worker_attendance as wa
  set
    is_canceled = true,
    updated_at = p_now
  where wa.id = p_attendance_id;

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
  where ws.user_id = p_target_user_id;

  insert into public.worker_attendance_corrections (
    attendance_id,
    target_user_id,
    actor_user_id,
    attendance_date,
    correction_action,
    before_status,
    before_source,
    before_source_action,
    pending_days_delta,
    sakit_days_delta,
    cuti_stock_delta,
    cuti_stock_before,
    cuti_stock_after,
    reason,
    created_at
  )
  values (
    p_attendance_id,
    p_target_user_id,
    p_actor_user_id,
    v_attendance_date,
    v_action,
    v_attendance_status,
    v_attendance_source,
    v_attendance_source_action,
    v_pending_days_delta,
    v_sakit_days_delta,
    v_cuti_stock_delta,
    v_cuti_stock_before,
    v_cuti_stock_after,
    v_reason,
    p_now
  )
  returning id into v_correction_id;

  v_audit_id := app_private.write_audit_log(
    'tracker',
    case v_action
      when 'CANCEL_CUTI' then 'tracker.cancel_cuti'
      when 'CANCEL_SAKIT' then 'tracker.cancel_sakit'
      when 'CANCEL_IZIN' then 'tracker.cancel_izin'
    end,
    'worker_attendance',
    p_attendance_id::text,
    pg_catalog.jsonb_build_object(
      'correction_id', v_correction_id,
      'correction_action', v_action,
      'attendance_id', p_attendance_id,
      'target_user_id', p_target_user_id,
      'attendance_date', v_attendance_date,
      'from_status', v_from_status,
      'to_status', 'off',
      'from_version', v_from_version,
      'to_version', v_from_version + 1,
      'pending_days_delta', v_pending_days_delta,
      'sakit_days_delta', v_sakit_days_delta,
      'cuti_stock_delta', v_cuti_stock_delta,
      'cuti_stock_after', v_cuti_stock_after,
      'reason', v_reason
    ),
    p_target_user_id
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'action', v_action,
    'audit_id', v_audit_id,
    'correction_id', v_correction_id,
    'target_user_id', p_target_user_id,
    'attendance_id', p_attendance_id,
    'from_status', v_from_status,
    'to_status', 'off',
    'from_version', v_from_version,
    'to_version', v_from_version + 1
  );
end;
$$;

comment on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz)
is 'Private SECURITY DEFINER tracker-origin absence cancellation with deterministic reversal, immutable correction ledger, and fail-closed audit.';

revoke execute on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz) from public;
revoke execute on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz) from anon;
revoke execute on function app_private.apply_tracker_correction_impl(uuid, uuid, text, bigint, uuid, text, timestamptz) from authenticated;

create or replace function public.apply_tracker_correction(
  p_target_user_id uuid,
  p_correction_action text,
  p_expected_version bigint,
  p_attendance_id uuid,
  p_reason text
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

  return app_private.apply_tracker_correction_impl(
    v_actor_id,
    p_target_user_id,
    p_correction_action,
    p_expected_version,
    p_attendance_id,
    p_reason,
    pg_catalog.clock_timestamp()
  );
end;
$$;

comment on function public.apply_tracker_correction(uuid, text, bigint, uuid, text)
is 'Authenticated Owner/Admin RPC entrypoint for tracker-origin CUTI, SAKIT, and IZIN cancellation.';

revoke execute on function public.apply_tracker_correction(uuid, text, bigint, uuid, text) from public;
revoke execute on function public.apply_tracker_correction(uuid, text, bigint, uuid, text) from anon;
grant execute on function public.apply_tracker_correction(uuid, text, bigint, uuid, text) to authenticated;
