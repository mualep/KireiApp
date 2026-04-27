-- Release 2A worker foundation.
-- Tracker UI/actions, attendance, records, SP, cron, and realtime are deferred.

create table if not exists public.worker_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  gid text not null,
  employee_role text not null,
  shift text not null,
  shift_start_hour smallint,
  shift_start_min smallint,
  shift_end_hour smallint,
  shift_end_min smallint,
  is_flexible boolean not null default false,
  show_card boolean not null default true,
  cuti_stock smallint not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_profiles_gid_key unique (gid),
  constraint worker_profiles_gid_format_check check (gid ~ '^KRU-[0-9]{3}$'),
  constraint worker_profiles_employee_role_check check (
    employee_role in (
      'Professional Player',
      'Expert Player',
      'Internship',
      'Customer Service',
      'Explorer',
      'Security',
      'Cleaning Service'
    )
  ),
  constraint worker_profiles_shift_check check (
    shift in ('A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3', 'flexible')
  ),
  constraint worker_profiles_shift_start_hour_check check (
    shift_start_hour is null or shift_start_hour between 0 and 23
  ),
  constraint worker_profiles_shift_start_min_check check (
    shift_start_min is null or shift_start_min between 0 and 59
  ),
  constraint worker_profiles_shift_end_hour_check check (
    shift_end_hour is null or shift_end_hour between 0 and 23
  ),
  constraint worker_profiles_shift_end_min_check check (
    shift_end_min is null or shift_end_min between 0 and 59
  ),
  constraint worker_profiles_cuti_stock_check check (cuti_stock >= 0),
  constraint worker_profiles_flexible_shift_shape_check check (
    (
      shift = 'flexible'
      and is_flexible = true
      and shift_start_hour is null
      and shift_start_min is null
      and shift_end_hour is null
      and shift_end_min is null
    )
    or
    (
      shift <> 'flexible'
      and is_flexible = false
      and shift_start_hour is not null
      and shift_start_min is not null
      and shift_end_hour is not null
      and shift_end_min is not null
    )
  )
);

create table if not exists public.worker_status (
  user_id uuid primary key references public.users(id) on delete cascade,
  version bigint not null default 0,
  current_status text not null default 'off',
  shift_active_date date,
  shift_active_started_at timestamptz,
  shift_active_label text,
  shift_active_start_hour smallint,
  shift_active_start_min smallint,
  shift_active_end_hour smallint,
  shift_active_end_min smallint,
  break_started_at timestamptz,
  break_timer_running boolean not null default false,
  break_accumulated_secs integer not null default 0,
  alpha_done boolean not null default false,
  break_late_recorded boolean not null default false,
  sakit_started_at timestamptz,
  pending_started_at timestamptz,
  cuti_set_date date,
  lembur_started_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint worker_status_version_check check (version >= 0),
  constraint worker_status_current_status_check check (
    current_status in ('off', 'on', 'break', 'cuti', 'sakit', 'pending', 'lembur')
  ),
  constraint worker_status_shift_active_label_check check (
    shift_active_label is null
    or shift_active_label in ('A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3', 'flexible')
  ),
  constraint worker_status_shift_active_start_hour_check check (
    shift_active_start_hour is null or shift_active_start_hour between 0 and 23
  ),
  constraint worker_status_shift_active_start_min_check check (
    shift_active_start_min is null or shift_active_start_min between 0 and 59
  ),
  constraint worker_status_shift_active_end_hour_check check (
    shift_active_end_hour is null or shift_active_end_hour between 0 and 23
  ),
  constraint worker_status_shift_active_end_min_check check (
    shift_active_end_min is null or shift_active_end_min between 0 and 59
  ),
  constraint worker_status_break_accumulated_secs_check check (break_accumulated_secs >= 0)
);

comment on table public.worker_profiles is
  'Release 2A current worker assignment profile. Role and shift are mutable current assignments, not permanent identity.';
comment on column public.worker_profiles.gid is
  'Stable worker identifier. Must not encode role, shift, tier, or schedule.';
comment on table public.worker_status is
  'Release 2A current worker stored status. LATE is derived and never stored.';
comment on column public.worker_status.alpha_done is
  'Derived display ALPHA flag. Tracker correction remains out of Release 2A.';

create index if not exists worker_profiles_show_card_shift_role_idx
  on public.worker_profiles (show_card, shift, employee_role)
  where show_card = true;

create index if not exists worker_status_current_status_idx
  on public.worker_status (current_status);

create index if not exists worker_status_alpha_done_user_id_idx
  on public.worker_status (user_id)
  where alpha_done = true;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_worker_profiles_updated_at'
      and tgrelid = 'public.worker_profiles'::regclass
  ) then
    execute 'create trigger set_worker_profiles_updated_at before update on public.worker_profiles for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_worker_status_updated_at'
      and tgrelid = 'public.worker_status'::regclass
  ) then
    execute 'create trigger set_worker_status_updated_at before update on public.worker_status for each row execute function app_private.set_updated_at()';
  end if;
end $$;

alter table public.worker_profiles enable row level security;
alter table public.worker_status enable row level security;

revoke all on public.worker_profiles from anon, authenticated;
revoke all on public.worker_status from anon, authenticated;

grant select on public.worker_profiles, public.worker_status to authenticated;
grant select, insert, update on public.worker_profiles, public.worker_status to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_profiles'
      and policyname = 'worker_profiles_select_self_or_admin'
  ) then
    execute $policy$
      create policy worker_profiles_select_self_or_admin
      on public.worker_profiles
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
      and tablename = 'worker_status'
      and policyname = 'worker_status_select_self_or_admin'
  ) then
    execute $policy$
      create policy worker_status_select_self_or_admin
      on public.worker_status
      for select
      to authenticated
      using (
        ((select auth.uid()) = user_id)
        or (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;
end $$;
