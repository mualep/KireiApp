-- R3D-C product amendment for Absensi corrections.
-- Reason is optional and capped at 20 trimmed characters.
-- Historical active HADIR may be corrected to absence statuses.

alter table public.worker_absensi_corrections
  alter column reason drop not null;

alter table public.worker_absensi_corrections
  drop constraint if exists worker_absensi_corrections_reason_check;

alter table public.worker_absensi_corrections
  add constraint worker_absensi_corrections_reason_check check (
    reason is null
    or char_length(pg_catalog.btrim(reason)) between 1 and 20
  );

alter table public.worker_absensi_corrections
  drop constraint if exists worker_absensi_corrections_transition_check;

alter table public.worker_absensi_corrections
  add constraint worker_absensi_corrections_transition_check check (
    before_status <> after_status
    and (
      (
        before_status = 'none'
        and after_status in ('hadir', 'cuti', 'sakit', 'pending', 'alpha')
      )
      or (
        before_status = 'hadir'
        and after_status in ('cuti', 'sakit', 'pending', 'alpha')
      )
      or (
        before_status = 'cuti'
        and after_status in ('hadir', 'sakit', 'pending', 'alpha')
      )
      or (
        before_status = 'sakit'
        and after_status in ('hadir', 'cuti', 'pending', 'alpha')
      )
      or (
        before_status = 'pending'
        and after_status in ('hadir', 'cuti', 'sakit', 'alpha')
      )
      or (
        before_status = 'alpha'
        and after_status in ('hadir', 'cuti', 'sakit', 'pending')
      )
    )
  );

create or replace function app_private.apply_absensi_correction_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_attendance_date date,
  p_before_status text,
  p_after_status text,
  p_expected_attendance_id uuid,
  p_expected_attendance_updated_at timestamptz,
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
  v_before_status text := pg_catalog.lower(nullif(pg_catalog.btrim(p_before_status), ''));
  v_after_status text := pg_catalog.lower(nullif(pg_catalog.btrim(p_after_status), ''));
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_current_wib_date date;
  v_after_source_action text;
  v_attendance_found boolean := false;
  v_existing_attendance_id uuid;
  v_existing_attendance_status text;
  v_existing_attendance_source text;
  v_existing_attendance_source_action text;
  v_existing_attendance_is_canceled boolean;
  v_existing_attendance_updated_at timestamptz;
  v_attendance_id uuid;
  v_attendance_updated_at timestamptz;
  v_period_month date;
  v_pending_days_delta integer := 0;
  v_sakit_days_delta integer := 0;
  v_alpha_count_delta integer := 0;
  v_cuti_stock_delta integer := 0;
  v_cuti_stock_before smallint;
  v_cuti_stock_after smallint;
  v_record_alpha_count integer;
  v_record_sakit_days integer;
  v_record_pending_days integer;
  v_record_found boolean := false;
  v_requires_existing_record boolean := false;
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
    raise exception 'absensi.unauthorized' using errcode = '42501';
  end if;

  if p_target_user_id is null
    or p_attendance_date is null
    or p_now is null
    or (v_reason is not null and pg_catalog.char_length(v_reason) > 20)
    or v_before_status is null
    or v_after_status is null
    or v_before_status not in ('none', 'hadir', 'cuti', 'sakit', 'pending', 'alpha')
    or v_after_status not in ('hadir', 'cuti', 'sakit', 'pending', 'alpha')
  then
    raise exception 'absensi.invalid_input' using errcode = '22023';
  end if;

  v_current_wib_date := (p_now at time zone 'Asia/Jakarta')::date;

  if p_attendance_date >= v_current_wib_date then
    raise exception 'absensi.invalid_date' using errcode = '22023';
  end if;

  if v_before_status = v_after_status
    or not (
      (
        v_before_status = 'none'
        and v_after_status in ('hadir', 'cuti', 'sakit', 'pending', 'alpha')
      )
      or (
        v_before_status = 'hadir'
        and v_after_status in ('cuti', 'sakit', 'pending', 'alpha')
      )
      or (
        v_before_status = 'cuti'
        and v_after_status in ('hadir', 'sakit', 'pending', 'alpha')
      )
      or (
        v_before_status = 'sakit'
        and v_after_status in ('hadir', 'cuti', 'pending', 'alpha')
      )
      or (
        v_before_status = 'pending'
        and v_after_status in ('hadir', 'cuti', 'sakit', 'alpha')
      )
      or (
        v_before_status = 'alpha'
        and v_after_status in ('hadir', 'cuti', 'sakit', 'pending')
      )
    )
  then
    raise exception 'absensi.invalid_transition' using errcode = '22023';
  end if;

  if v_before_status = 'none' then
    if p_expected_attendance_id is not null
      or p_expected_attendance_updated_at is not null
    then
      raise exception 'absensi.invalid_input' using errcode = '22023';
    end if;
  elsif p_expected_attendance_id is null
    or p_expected_attendance_updated_at is null
  then
    raise exception 'absensi.invalid_input' using errcode = '22023';
  end if;

  perform 1
  from public.users as u
  join public.worker_profiles as wp on wp.user_id = u.id
  where u.id = p_target_user_id
    and u.is_deleted = false
    and wp.show_card = true;

  if not found then
    raise exception 'absensi.invalid_target' using errcode = '22023';
  end if;

  v_after_source_action := 'absensi.correct_' || v_after_status;
  v_period_month := pg_catalog.date_trunc('month', p_attendance_date::timestamp)::date;
  v_pending_days_delta :=
    case when v_after_status = 'pending' then 1 else 0 end
    - case when v_before_status = 'pending' then 1 else 0 end;
  v_sakit_days_delta :=
    case when v_after_status = 'sakit' then 1 else 0 end
    - case when v_before_status = 'sakit' then 1 else 0 end;
  v_alpha_count_delta :=
    case when v_after_status = 'alpha' then 1 else 0 end
    - case when v_before_status = 'alpha' then 1 else 0 end;
  v_cuti_stock_delta :=
    case when v_before_status = 'cuti' then 1 else 0 end
    - case when v_after_status = 'cuti' then 1 else 0 end;

  select
    wa.id,
    wa.status,
    wa.source,
    wa.source_action,
    wa.is_canceled,
    wa.updated_at
    into
      v_existing_attendance_id,
      v_existing_attendance_status,
      v_existing_attendance_source,
      v_existing_attendance_source_action,
      v_existing_attendance_is_canceled,
      v_existing_attendance_updated_at
  from public.worker_attendance as wa
  where wa.user_id = p_target_user_id
    and wa.attendance_date = p_attendance_date
  for update;

  v_attendance_found := found;

  if v_before_status = 'none' then
    if v_attendance_found and not v_existing_attendance_is_canceled then
      raise exception 'absensi.attendance_conflict' using errcode = '40001';
    end if;

    if v_attendance_found then
      update public.worker_attendance as wa
      set
        status = v_after_status,
        source = 'absensi',
        source_action = v_after_source_action,
        created_at = p_now,
        updated_at = p_now,
        is_canceled = false
      where wa.id = v_existing_attendance_id
      returning wa.id, wa.updated_at
        into v_attendance_id, v_attendance_updated_at;
    else
      insert into public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at,
        is_canceled
      )
      values (
        p_target_user_id,
        p_attendance_date,
        v_after_status,
        'absensi',
        v_after_source_action,
        p_now,
        p_now,
        false
      )
      returning id, updated_at
        into v_attendance_id, v_attendance_updated_at;
    end if;
  else
    if not v_attendance_found
      or v_existing_attendance_is_canceled
      or v_existing_attendance_id <> p_expected_attendance_id
      or v_existing_attendance_updated_at <> p_expected_attendance_updated_at
      or v_existing_attendance_status <> v_before_status
    then
      raise exception 'absensi.attendance_conflict' using errcode = '40001';
    end if;

    update public.worker_attendance as wa
    set
      status = v_after_status,
      source = 'absensi',
      source_action = v_after_source_action,
      updated_at = p_now,
      is_canceled = false
    where wa.id = v_existing_attendance_id
    returning wa.id, wa.updated_at
      into v_attendance_id, v_attendance_updated_at;
  end if;

  if v_cuti_stock_delta <> 0 then
    select wp.cuti_stock
      into v_cuti_stock_before
    from public.worker_profiles as wp
    where wp.user_id = p_target_user_id
    for update;

    if not found then
      raise exception 'absensi.invalid_target' using errcode = '22023';
    end if;

    v_cuti_stock_after := v_cuti_stock_before + v_cuti_stock_delta;

    if v_cuti_stock_after < 0 then
      raise exception 'absensi.cuti_stock_exhausted' using errcode = '23514';
    end if;

    update public.worker_profiles as wp
    set cuti_stock = v_cuti_stock_after
    where wp.user_id = p_target_user_id;
  end if;

  if v_pending_days_delta <> 0
    or v_sakit_days_delta <> 0
    or v_alpha_count_delta <> 0
    or v_cuti_stock_delta <> 0
  then
    v_requires_existing_record :=
      v_pending_days_delta < 0
      or v_sakit_days_delta < 0
      or v_alpha_count_delta < 0
      or v_cuti_stock_delta > 0;

    if v_requires_existing_record then
      select
        wr.alpha_count,
        wr.sakit_days,
        wr.pending_days
        into
          v_record_alpha_count,
          v_record_sakit_days,
          v_record_pending_days
      from public.worker_records as wr
      where wr.user_id = p_target_user_id
        and wr.period_month = v_period_month
      for update;

      v_record_found := found;

      if not v_record_found
        or v_record_alpha_count + v_alpha_count_delta < 0
        or v_record_sakit_days + v_sakit_days_delta < 0
        or v_record_pending_days + v_pending_days_delta < 0
      then
        raise exception 'absensi.records_missing' using errcode = '22023';
      end if;

      update public.worker_records as wr
      set
        alpha_count = wr.alpha_count + v_alpha_count_delta,
        sakit_days = wr.sakit_days + v_sakit_days_delta,
        pending_days = wr.pending_days + v_pending_days_delta,
        cuti_stock_snapshot = case
          when v_cuti_stock_delta <> 0 then v_cuti_stock_after
          else wr.cuti_stock_snapshot
        end,
        last_source = 'absensi',
        last_source_action = v_after_source_action,
        updated_at = p_now
      where wr.user_id = p_target_user_id
        and wr.period_month = v_period_month;
    else
      insert into public.worker_records (
        user_id,
        period_month,
        alpha_count,
        sakit_days,
        pending_days,
        cuti_stock_snapshot,
        last_source,
        last_source_action,
        created_at,
        updated_at
      )
      values (
        p_target_user_id,
        v_period_month,
        v_alpha_count_delta,
        v_sakit_days_delta,
        v_pending_days_delta,
        case when v_cuti_stock_delta <> 0 then v_cuti_stock_after end,
        'absensi',
        v_after_source_action,
        p_now,
        p_now
      )
      on conflict (user_id, period_month) do update
      set
        alpha_count = public.worker_records.alpha_count + excluded.alpha_count,
        sakit_days = public.worker_records.sakit_days + excluded.sakit_days,
        pending_days = public.worker_records.pending_days + excluded.pending_days,
        cuti_stock_snapshot = coalesce(
          excluded.cuti_stock_snapshot,
          public.worker_records.cuti_stock_snapshot
        ),
        last_source = 'absensi',
        last_source_action = v_after_source_action,
        updated_at = p_now;
    end if;
  end if;

  insert into public.worker_absensi_corrections (
    attendance_id,
    target_user_id,
    actor_user_id,
    attendance_date,
    before_status,
    after_status,
    before_source,
    before_source_action,
    after_source,
    after_source_action,
    before_attendance_is_canceled,
    pending_days_delta,
    sakit_days_delta,
    alpha_count_delta,
    cuti_stock_delta,
    cuti_stock_before,
    cuti_stock_after,
    reason,
    created_at
  )
  values (
    v_attendance_id,
    p_target_user_id,
    p_actor_user_id,
    p_attendance_date,
    v_before_status,
    v_after_status,
    case when v_attendance_found then v_existing_attendance_source end,
    case when v_attendance_found then v_existing_attendance_source_action end,
    'absensi',
    v_after_source_action,
    coalesce(v_existing_attendance_is_canceled, false),
    v_pending_days_delta,
    v_sakit_days_delta,
    v_alpha_count_delta,
    v_cuti_stock_delta,
    v_cuti_stock_before,
    v_cuti_stock_after,
    v_reason,
    p_now
  )
  returning id into v_correction_id;

  v_audit_id := app_private.write_audit_log(
    'absensi',
    'absensi.correct',
    'worker_attendance',
    v_attendance_id::text,
    pg_catalog.jsonb_build_object(
      'correction_id', v_correction_id,
      'attendance_id', v_attendance_id,
      'target_user_id', p_target_user_id,
      'attendance_date', p_attendance_date,
      'before_status', v_before_status,
      'after_status', v_after_status,
      'before_source', case when v_attendance_found then v_existing_attendance_source end,
      'before_source_action', case when v_attendance_found then v_existing_attendance_source_action end,
      'after_source', 'absensi',
      'after_source_action', v_after_source_action,
      'before_attendance_is_canceled', coalesce(v_existing_attendance_is_canceled, false),
      'pending_days_delta', v_pending_days_delta,
      'sakit_days_delta', v_sakit_days_delta,
      'alpha_count_delta', v_alpha_count_delta,
      'cuti_stock_delta', v_cuti_stock_delta,
      'cuti_stock_before', v_cuti_stock_before,
      'cuti_stock_after', v_cuti_stock_after,
      'reason', v_reason
    ),
    p_target_user_id
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'attendance_id', v_attendance_id,
    'attendance_updated_at', v_attendance_updated_at,
    'correction_id', v_correction_id,
    'audit_id', v_audit_id,
    'target_user_id', p_target_user_id,
    'attendance_date', p_attendance_date,
    'before_status', v_before_status,
    'after_status', v_after_status,
    'pending_days_delta', v_pending_days_delta,
    'sakit_days_delta', v_sakit_days_delta,
    'alpha_count_delta', v_alpha_count_delta,
    'cuti_stock_delta', v_cuti_stock_delta,
    'cuti_stock_before', v_cuti_stock_before,
    'cuti_stock_after', v_cuti_stock_after
  );
end;
$$;

comment on function app_private.apply_absensi_correction_impl(
  uuid,
  uuid,
  date,
  text,
  text,
  uuid,
  timestamptz,
  text,
  timestamptz
) is
  'Private Absensi/Admin historical attendance correction implementation with optional short reason and HADIR-to-absence support.';

revoke execute on function app_private.apply_absensi_correction_impl(uuid, uuid, date, text, text, uuid, timestamptz, text, timestamptz) from public;
revoke execute on function app_private.apply_absensi_correction_impl(uuid, uuid, date, text, text, uuid, timestamptz, text, timestamptz) from anon;
revoke execute on function app_private.apply_absensi_correction_impl(uuid, uuid, date, text, text, uuid, timestamptz, text, timestamptz) from authenticated;
