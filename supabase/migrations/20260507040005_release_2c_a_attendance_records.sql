-- Release 2C-A worker attendance and monthly records foundation.
-- Tracker action mutations, cron, realtime, reset status, and worker_sp remain deferred.

create table if not exists public.worker_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  attendance_date date not null,
  status text not null,
  source text not null,
  source_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_attendance_user_date_key unique (user_id, attendance_date),
  constraint worker_attendance_user_profile_fkey
    foreign key (user_id) references public.worker_profiles(user_id) on delete cascade,
  constraint worker_attendance_status_check check (
    status in ('hadir', 'cuti', 'sakit', 'pending', 'alpha')
  ),
  constraint worker_attendance_source_check check (
    source in ('tracker', 'absensi', 'cron', 'system')
  ),
  constraint worker_attendance_source_action_check check (
    source_action ~ '^[a-z][a-z0-9_.-]*$'
  ),
  constraint worker_attendance_no_alpha_from_tracker_check check (
    not (
      source = 'tracker'
      and status = 'alpha'
    )
  )
);

comment on table public.worker_attendance is
  'Release 2C-A daily attendance truth. One row per worker/date when a daily outcome exists.';
comment on column public.worker_attendance.attendance_date is
  'WIB-derived business date for the worker shift outcome.';
comment on column public.worker_attendance.status is
  'Daily attendance outcome. Derived tracker LATE is not stored here.';
comment on column public.worker_attendance.source is
  'Writer class for future side effects: tracker, absensi, cron, or system.';

create index if not exists worker_attendance_date_status_idx
  on public.worker_attendance (attendance_date, status);

create table if not exists public.worker_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_month date not null,
  work_late_seconds integer not null default 0,
  break_late_seconds integer not null default 0,
  alpha_count integer not null default 0,
  sakit_days integer not null default 0,
  pending_days integer not null default 0,
  lembur_units integer not null default 0,
  cuti_stock_snapshot smallint,
  work_late_override_seconds integer,
  break_late_override_seconds integer,
  alpha_override_count integer,
  sakit_override_days integer,
  pending_override_days integer,
  lembur_override_units integer,
  cuti_stock_override_snapshot smallint,
  last_source text,
  last_source_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_records_user_period_key unique (user_id, period_month),
  constraint worker_records_user_profile_fkey
    foreign key (user_id) references public.worker_profiles(user_id) on delete cascade,
  constraint worker_records_period_month_check check (
    period_month = date_trunc('month', period_month)::date
  ),
  constraint worker_records_work_late_seconds_check check (work_late_seconds >= 0),
  constraint worker_records_break_late_seconds_check check (break_late_seconds >= 0),
  constraint worker_records_alpha_count_check check (alpha_count >= 0),
  constraint worker_records_sakit_days_check check (sakit_days >= 0),
  constraint worker_records_pending_days_check check (pending_days >= 0),
  constraint worker_records_lembur_units_check check (lembur_units >= 0),
  constraint worker_records_cuti_stock_snapshot_check check (
    cuti_stock_snapshot is null or cuti_stock_snapshot >= 0
  ),
  constraint worker_records_work_late_override_seconds_check check (
    work_late_override_seconds is null or work_late_override_seconds >= 0
  ),
  constraint worker_records_break_late_override_seconds_check check (
    break_late_override_seconds is null or break_late_override_seconds >= 0
  ),
  constraint worker_records_alpha_override_count_check check (
    alpha_override_count is null or alpha_override_count >= 0
  ),
  constraint worker_records_sakit_override_days_check check (
    sakit_override_days is null or sakit_override_days >= 0
  ),
  constraint worker_records_pending_override_days_check check (
    pending_override_days is null or pending_override_days >= 0
  ),
  constraint worker_records_lembur_override_units_check check (
    lembur_override_units is null or lembur_override_units >= 0
  ),
  constraint worker_records_cuti_stock_override_snapshot_check check (
    cuti_stock_override_snapshot is null or cuti_stock_override_snapshot >= 0
  ),
  constraint worker_records_last_source_check check (
    last_source is null or last_source in ('tracker', 'absensi', 'cron', 'system')
  ),
  constraint worker_records_last_source_action_check check (
    last_source_action is null or last_source_action ~ '^[a-z][a-z0-9_.-]*$'
  )
);

comment on table public.worker_records is
  'Release 2C-A monthly aggregate and reporting snapshot for workers.';
comment on column public.worker_records.period_month is
  'First day of the WIB-derived business month for this aggregate row.';
comment on column public.worker_records.lembur_units is
  'Internal overtime unit storage. Conversion to display hours belongs to future reporting reads.';
comment on column public.worker_records.cuti_stock_snapshot is
  'Historical leave stock snapshot. worker_profiles.cuti_stock remains the current balance source.';
comment on column public.worker_records.work_late_override_seconds is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';
comment on column public.worker_records.break_late_override_seconds is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';
comment on column public.worker_records.alpha_override_count is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';
comment on column public.worker_records.sakit_override_days is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';
comment on column public.worker_records.pending_override_days is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';
comment on column public.worker_records.lembur_override_units is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';
comment on column public.worker_records.cuti_stock_override_snapshot is
  'Manual override value; future aggregation must not blindly overwrite populated override fields.';

create index if not exists worker_records_period_month_user_id_idx
  on public.worker_records (period_month, user_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_worker_attendance_updated_at'
      and tgrelid = 'public.worker_attendance'::regclass
  ) then
    execute 'create trigger set_worker_attendance_updated_at before update on public.worker_attendance for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_worker_records_updated_at'
      and tgrelid = 'public.worker_records'::regclass
  ) then
    execute 'create trigger set_worker_records_updated_at before update on public.worker_records for each row execute function app_private.set_updated_at()';
  end if;
end $$;

alter table public.worker_attendance enable row level security;
alter table public.worker_records enable row level security;

revoke all on public.worker_attendance from anon, authenticated;
revoke all on public.worker_records from anon, authenticated;

grant select, insert, update on public.worker_attendance, public.worker_records to authenticated;
grant select, insert, update on public.worker_attendance, public.worker_records to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_attendance'
      and policyname = 'worker_attendance_select_self_or_admin'
  ) then
    execute $policy$
      create policy worker_attendance_select_self_or_admin
      on public.worker_attendance
      for select
      to authenticated
      using (
        ((select auth.uid()) = user_id)
        or (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_attendance'
      and policyname = 'worker_attendance_insert_admin_only'
  ) then
    execute $policy$
      create policy worker_attendance_insert_admin_only
      on public.worker_attendance
      for insert
      to authenticated
      with check (
        (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_attendance'
      and policyname = 'worker_attendance_update_admin_only'
  ) then
    execute $policy$
      create policy worker_attendance_update_admin_only
      on public.worker_attendance
      for update
      to authenticated
      using (
        (select app_private.is_admin_or_owner())
      )
      with check (
        (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_records'
      and policyname = 'worker_records_select_self_or_admin'
  ) then
    execute $policy$
      create policy worker_records_select_self_or_admin
      on public.worker_records
      for select
      to authenticated
      using (
        ((select auth.uid()) = user_id)
        or (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_records'
      and policyname = 'worker_records_insert_admin_only'
  ) then
    execute $policy$
      create policy worker_records_insert_admin_only
      on public.worker_records
      for insert
      to authenticated
      with check (
        (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_records'
      and policyname = 'worker_records_update_admin_only'
  ) then
    execute $policy$
      create policy worker_records_update_admin_only
      on public.worker_records
      for update
      to authenticated
      using (
        (select app_private.is_admin_or_owner())
      )
      with check (
        (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;
end $$;
