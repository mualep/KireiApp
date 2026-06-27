create table if not exists public.worker_records_override_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  period_month date not null,
  field_name text not null,
  before_value integer,
  after_value integer,
  reason text,
  created_at timestamptz not null default now(),
  constraint worker_records_override_log_period_month_check check (
    period_month = date_trunc('month', period_month)::date
  ),
  constraint worker_records_override_log_field_name_check check (
    field_name in (
      'work_late_override_seconds',
      'break_late_override_seconds',
      'alpha_override_count',
      'sakit_override_days',
      'pending_override_days',
      'lembur_override_units',
      'cuti_stock_override_snapshot'
    )
  ),
  constraint worker_records_override_log_before_value_check check (
    before_value is null or before_value >= 0
  ),
  constraint worker_records_override_log_after_value_check check (
    after_value is null or after_value >= 0
  ),
  constraint worker_records_override_log_reason_check check (
    reason is null or char_length(pg_catalog.btrim(reason)) between 1 and 20
  )
);

create index if not exists worker_records_override_log_target_idx on public.worker_records_override_log (target_user_id, created_at desc);

alter table public.worker_records_override_log enable row level security;
revoke all on public.worker_records_override_log from anon, authenticated;
grant select on public.worker_records_override_log to authenticated;

create policy worker_records_override_log_select_admin_only
on public.worker_records_override_log
for select
to authenticated
using ((select app_private.is_admin_or_owner()));

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

create or replace function public.apply_records_override(
  p_target_user_id uuid,
  p_period_month date,
  p_field_name text,
  p_before_value integer,
  p_after_value integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_actor_user_id is null then
    raise exception 'records.unauthorized';
  end if;

  return app_private.apply_records_override_impl(
    v_actor_user_id,
    p_target_user_id,
    p_period_month,
    p_field_name,
    p_before_value,
    p_after_value,
    p_reason,
    v_now
  );
end;
$$;

revoke execute on function app_private.apply_records_override_impl(uuid, uuid, date, text, integer, integer, text, timestamptz) from public;
revoke execute on function app_private.apply_records_override_impl(uuid, uuid, date, text, integer, integer, text, timestamptz) from anon;
revoke execute on function app_private.apply_records_override_impl(uuid, uuid, date, text, integer, integer, text, timestamptz) from authenticated;

revoke execute on function public.apply_records_override(uuid, date, text, integer, integer, text) from public;
revoke execute on function public.apply_records_override(uuid, date, text, integer, integer, text) from anon;
grant execute on function public.apply_records_override(uuid, date, text, integer, integer, text) to authenticated;
