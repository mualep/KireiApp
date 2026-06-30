-- Fix records override for missing worker_records row
-- If a worker has no records row for the target month yet, this ensure it is inserted before lock/update.

create or replace function app_private.apply_records_override_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_period_month date,
  p_field_name text,
  p_before_value integer,
  p_after_value integer,
  p_reason text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_show_card boolean;
  v_is_deleted boolean;
  v_existing_value integer;
  v_reason text;
  v_ledger_id uuid;
  v_audit_id uuid;
begin
  -- Validate actor
  select tier into v_tier from public.users where id = p_actor_user_id and is_deleted = false;
  if not found or v_tier not in ('owner', 'admin') then
    raise exception 'records.unauthorized';
  end if;

  -- Validate target
  select u.is_deleted, wp.show_card
  into v_is_deleted, v_show_card
  from public.users as u
  join public.worker_profiles as wp on wp.user_id = u.id
  where u.id = p_target_user_id;

  if not found or coalesce(v_is_deleted, true) = true or coalesce(v_show_card, false) = false then
    raise exception 'records.invalid_target';
  end if;

  -- Validate value
  if p_after_value is not null and p_after_value < 0 then
    raise exception 'records.invalid_value';
  end if;

  v_reason := pg_catalog.btrim(p_reason);
  if pg_catalog.char_length(v_reason) = 0 then
    v_reason := null;
  elsif pg_catalog.char_length(v_reason) > 20 then
    raise exception 'records.invalid_value';
  end if;

  -- Ensure the worker record exists for this period_month before locking/updating
  insert into public.worker_records (
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
  values (
    p_target_user_id,
    p_period_month,
    0,
    0,
    0,
    0,
    0,
    0,
    coalesce((select cuti_stock from public.worker_profiles where user_id = p_target_user_id), 0),
    'system',
    'system.override_init',
    p_now,
    p_now
  )
  on conflict (user_id, period_month) do nothing;

  -- Lock and read existing value
  if p_field_name = 'work_late_override_seconds' then
    select work_late_override_seconds into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  elsif p_field_name = 'break_late_override_seconds' then
    select break_late_override_seconds into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  elsif p_field_name = 'alpha_override_count' then
    select alpha_override_count into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  elsif p_field_name = 'sakit_override_days' then
    select sakit_override_days into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  elsif p_field_name = 'pending_override_days' then
    select pending_override_days into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  elsif p_field_name = 'lembur_override_units' then
    select lembur_override_units into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  elsif p_field_name = 'cuti_stock_override_snapshot' then
    select cuti_stock_override_snapshot into v_existing_value from public.worker_records where user_id = p_target_user_id and period_month = p_period_month for update;
  else
    raise exception 'records.invalid_value';
  end if;

  if v_existing_value is distinct from p_before_value then
    raise exception 'records.stale_override';
  end if;

  -- Update worker_records
  if p_field_name = 'work_late_override_seconds' then
    update public.worker_records set work_late_override_seconds = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  elsif p_field_name = 'break_late_override_seconds' then
    update public.worker_records set break_late_override_seconds = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  elsif p_field_name = 'alpha_override_count' then
    update public.worker_records set alpha_override_count = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  elsif p_field_name = 'sakit_override_days' then
    update public.worker_records set sakit_override_days = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  elsif p_field_name = 'pending_override_days' then
    update public.worker_records set pending_override_days = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  elsif p_field_name = 'lembur_override_units' then
    update public.worker_records set lembur_override_units = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  elsif p_field_name = 'cuti_stock_override_snapshot' then
    update public.worker_records set cuti_stock_override_snapshot = p_after_value, updated_at = p_now where user_id = p_target_user_id and period_month = p_period_month;
  end if;

  -- Write to ledger
  insert into public.worker_records_override_log (
    target_user_id,
    actor_user_id,
    period_month,
    field_name,
    before_value,
    after_value,
    reason,
    created_at
  ) values (
    p_target_user_id,
    p_actor_user_id,
    p_period_month,
    p_field_name,
    p_before_value,
    p_after_value,
    v_reason,
    p_now
  ) returning id into v_ledger_id;

  v_audit_id := app_private.write_audit_log(
    'records',
    'records.override',
    'worker_records_override_log',
    v_ledger_id::text,
    pg_catalog.jsonb_build_object(
      'field_name', p_field_name,
      'before_value', p_before_value,
      'after_value', p_after_value,
      'period_month', p_period_month,
      'reason', v_reason
    ),
    p_target_user_id
  );

  return pg_catalog.jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'ledger_id', v_ledger_id
  );
end;
$$;
