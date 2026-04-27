-- Release 1 schema baseline for Kireiku App.
-- Seeds are intentionally deferred to R1-05.
-- Release 2+ deferred tables: worker_profiles, worker_status, worker_attendance,
-- worker_records, worker_sp, tracker functions, and cron functions.

create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  tier text not null constraint users_tier_check check (tier in ('owner', 'admin', 'member')),
  avatar_url text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_content (
  id uuid primary key default gen_random_uuid(),
  section text not null constraint landing_content_section_check
    check (section in ('hero', 'stats', 'why', 'how_it_works', 'footer')),
  content_key text not null,
  content_value jsonb not null,
  updated_at timestamptz not null default now(),
  constraint landing_content_section_content_key_key unique (section, content_key)
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  game_name text not null,
  service_type text not null constraint services_service_type_check
    check (service_type in ('Rank Boost', 'Quest Completion', 'Account Leveling', 'Custom')),
  description text,
  icon_url text,
  image_url text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  game text not null,
  rating smallint not null constraint testimonials_rating_check check (rating between 1 and 5),
  comment text not null,
  avatar_url text,
  is_visible boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.access_permissions (
  id uuid primary key default gen_random_uuid(),
  tier text not null constraint access_permissions_tier_check check (tier in ('admin', 'member')),
  resource text not null constraint access_permissions_resource_check
    check (resource in ('dashboard', 'tracker', 'absensi', 'records', 'users', 'content', 'access-manager', 'profile')),
  action text not null constraint access_permissions_action_check
    check (action in ('view', 'action', 'create', 'edit', 'delete', 'reset')),
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint access_permissions_tier_resource_action_key unique (tier, resource, action)
);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references public.users(id),
  target_tier text not null constraint access_logs_target_tier_check check (target_tier in ('admin', 'member')),
  resource text not null,
  action text not null,
  old_value boolean,
  new_value boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id),
  target_user_id uuid references public.users(id),
  domain text not null,
  action text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Staff auth profile rows only. Authenticated Customer is out of v1 scope.';
comment on table public.landing_content is 'Editable public landing content for non-FAQ sections only.';
comment on table public.faq_items is 'Dedicated FAQ rows for validated FAQ CRUD in v1.';
comment on table public.access_permissions is 'Static permission matrix storage for v1; configurable Access Manager UI is deferred.';
comment on table public.access_logs is 'Permission/default-matrix event log, not the general audit trail.';
comment on table public.audit_logs is 'General audit foundation for sensitive v1 mutations.';

create index if not exists users_tier_idx on public.users (tier);
create index if not exists users_is_deleted_idx on public.users (is_deleted);
create index if not exists faq_items_sort_order_idx on public.faq_items (sort_order);
create index if not exists services_active_sort_order_idx on public.services (is_active, sort_order);
create index if not exists testimonials_visible_sort_order_idx on public.testimonials (is_visible, sort_order);
create index if not exists access_logs_changed_by_created_at_idx on public.access_logs (changed_by, created_at);
create index if not exists audit_logs_actor_user_id_created_at_idx on public.audit_logs (actor_user_id, created_at);
create index if not exists audit_logs_target_user_id_created_at_idx on public.audit_logs (target_user_id, created_at);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_users_updated_at' and tgrelid = 'public.users'::regclass) then
    execute 'create trigger set_users_updated_at before update on public.users for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_landing_content_updated_at' and tgrelid = 'public.landing_content'::regclass) then
    execute 'create trigger set_landing_content_updated_at before update on public.landing_content for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_faq_items_updated_at' and tgrelid = 'public.faq_items'::regclass) then
    execute 'create trigger set_faq_items_updated_at before update on public.faq_items for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_services_updated_at' and tgrelid = 'public.services'::regclass) then
    execute 'create trigger set_services_updated_at before update on public.services for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_testimonials_updated_at' and tgrelid = 'public.testimonials'::regclass) then
    execute 'create trigger set_testimonials_updated_at before update on public.testimonials for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_app_settings_updated_at' and tgrelid = 'public.app_settings'::regclass) then
    execute 'create trigger set_app_settings_updated_at before update on public.app_settings for each row execute function app_private.set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_access_permissions_updated_at' and tgrelid = 'public.access_permissions'::regclass) then
    execute 'create trigger set_access_permissions_updated_at before update on public.access_permissions for each row execute function app_private.set_updated_at()';
  end if;
end $$;

create or replace function app_private.current_user_tier()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.tier
  from public.users as u
  where u.id = (select auth.uid())
    and u.is_deleted = false
  limit 1
$$;

create or replace function app_private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_user_tier() = 'owner', false)
$$;

create or replace function app_private.is_admin_or_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_user_tier() in ('owner', 'admin'), false)
$$;

revoke all on function app_private.current_user_tier() from public, anon, authenticated;
revoke all on function app_private.is_owner() from public, anon, authenticated;
revoke all on function app_private.is_admin_or_owner() from public, anon, authenticated;

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_tier() to authenticated;
grant execute on function app_private.is_owner() to authenticated;
grant execute on function app_private.is_admin_or_owner() to authenticated;

alter table public.users enable row level security;
alter table public.landing_content enable row level security;
alter table public.faq_items enable row level security;
alter table public.services enable row level security;
alter table public.testimonials enable row level security;
alter table public.app_settings enable row level security;
alter table public.access_permissions enable row level security;
alter table public.access_logs enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.landing_content, public.faq_items, public.services, public.testimonials to anon, authenticated;
grant select on public.users, public.app_settings, public.access_permissions, public.access_logs, public.audit_logs to authenticated;
grant insert, update, delete on public.landing_content, public.faq_items, public.services, public.testimonials to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_select_self_or_admin'
  ) then
    execute $policy$
      create policy users_select_self_or_admin
      on public.users
      for select
      to authenticated
      using (
        (((select auth.uid()) = id) and is_deleted = false)
        or (select app_private.is_admin_or_owner())
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landing_content' and policyname = 'landing_content_public_select'
  ) then
    execute $policy$
      create policy landing_content_public_select
      on public.landing_content
      for select
      to anon, authenticated
      using (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landing_content' and policyname = 'landing_content_staff_insert'
  ) then
    execute $policy$
      create policy landing_content_staff_insert
      on public.landing_content
      for insert
      to authenticated
      with check (
        (select app_private.is_owner())
        or ((select app_private.is_admin_or_owner()) and section <> 'footer')
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landing_content' and policyname = 'landing_content_staff_update'
  ) then
    execute $policy$
      create policy landing_content_staff_update
      on public.landing_content
      for update
      to authenticated
      using (
        (select app_private.is_owner())
        or ((select app_private.is_admin_or_owner()) and section <> 'footer')
      )
      with check (
        (select app_private.is_owner())
        or ((select app_private.is_admin_or_owner()) and section <> 'footer')
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landing_content' and policyname = 'landing_content_staff_delete'
  ) then
    execute $policy$
      create policy landing_content_staff_delete
      on public.landing_content
      for delete
      to authenticated
      using (
        (select app_private.is_owner())
        or ((select app_private.is_admin_or_owner()) and section <> 'footer')
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'faq_items' and policyname = 'faq_items_public_select'
  ) then
    execute $policy$
      create policy faq_items_public_select
      on public.faq_items
      for select
      to anon, authenticated
      using (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'faq_items' and policyname = 'faq_items_staff_manage'
  ) then
    execute $policy$
      create policy faq_items_staff_manage
      on public.faq_items
      for all
      to authenticated
      using ((select app_private.is_admin_or_owner()))
      with check ((select app_private.is_admin_or_owner()))
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'services_public_select_active'
  ) then
    execute $policy$
      create policy services_public_select_active
      on public.services
      for select
      to anon, authenticated
      using (is_active = true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'services_staff_manage'
  ) then
    execute $policy$
      create policy services_staff_manage
      on public.services
      for all
      to authenticated
      using ((select app_private.is_admin_or_owner()))
      with check ((select app_private.is_admin_or_owner()))
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'testimonials' and policyname = 'testimonials_public_select_visible'
  ) then
    execute $policy$
      create policy testimonials_public_select_visible
      on public.testimonials
      for select
      to anon, authenticated
      using (is_visible = true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'testimonials' and policyname = 'testimonials_staff_manage'
  ) then
    execute $policy$
      create policy testimonials_staff_manage
      on public.testimonials
      for all
      to authenticated
      using ((select app_private.is_admin_or_owner()))
      with check ((select app_private.is_admin_or_owner()))
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_settings' and policyname = 'app_settings_staff_select'
  ) then
    execute $policy$
      create policy app_settings_staff_select
      on public.app_settings
      for select
      to authenticated
      using ((select app_private.is_admin_or_owner()))
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'access_permissions' and policyname = 'access_permissions_staff_select'
  ) then
    execute $policy$
      create policy access_permissions_staff_select
      on public.access_permissions
      for select
      to authenticated
      using ((select app_private.is_admin_or_owner()))
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'access_logs' and policyname = 'access_logs_owner_select'
  ) then
    execute $policy$
      create policy access_logs_owner_select
      on public.access_logs
      for select
      to authenticated
      using ((select app_private.is_owner()))
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'audit_logs_owner_select'
  ) then
    execute $policy$
      create policy audit_logs_owner_select
      on public.audit_logs
      for select
      to authenticated
      using ((select app_private.is_owner()))
    $policy$;
  end if;
end $$;
