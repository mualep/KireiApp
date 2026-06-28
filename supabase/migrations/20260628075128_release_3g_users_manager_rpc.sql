create table if not exists public.worker_sp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sp_level integer not null,
  reason text not null,
  issued_by uuid not null references public.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_by uuid references public.users(id) on delete restrict,
  revoked_at timestamptz,
  constraint worker_sp_logs_level_check check (sp_level in (1, 2, 3))
);

create index if not exists worker_sp_logs_user_idx on public.worker_sp_logs (user_id, issued_at desc);

alter table public.worker_sp_logs enable row level security;
revoke all on public.worker_sp_logs from anon, authenticated;
grant select on public.worker_sp_logs to authenticated;

create policy worker_sp_logs_select_policy
on public.worker_sp_logs
for select
to authenticated
using (
  (select app_private.is_admin_or_owner())
  or
  user_id = (select auth.uid())
);

-- ============================================================================
-- Deactivate Worker
-- ============================================================================
create or replace function app_private.deactivate_worker_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_is_deleted boolean;
begin
  select tier into v_tier from public.users where id = p_actor_user_id and is_deleted = false;
  if not found or v_tier not in ('owner', 'admin') then
    raise exception 'users.unauthorized';
  end if;

  select is_deleted into v_is_deleted from public.users where id = p_target_user_id;
  if not found or coalesce(v_is_deleted, true) = true then
    raise exception 'users.invalid_target';
  end if;

  update public.users set is_deleted = true, updated_at = p_now where id = p_target_user_id;
  update public.worker_profiles set show_card = false, updated_at = p_now where user_id = p_target_user_id;

  perform app_private.write_audit_log(
    'users',
    'users.deactivate',
    'users',
    p_target_user_id::text,
    '{}'::jsonb,
    p_target_user_id
  );
end;
$$;

create or replace function public.deactivate_worker(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_actor_user_id is null then
    raise exception 'users.unauthorized';
  end if;
  perform app_private.deactivate_worker_impl(v_actor_user_id, p_target_user_id, v_now);
end;
$$;

revoke execute on function app_private.deactivate_worker_impl(uuid, uuid, timestamptz) from public;
revoke execute on function app_private.deactivate_worker_impl(uuid, uuid, timestamptz) from anon;
revoke execute on function app_private.deactivate_worker_impl(uuid, uuid, timestamptz) from authenticated;

revoke execute on function public.deactivate_worker(uuid) from public;
revoke execute on function public.deactivate_worker(uuid) from anon;
grant execute on function public.deactivate_worker(uuid) to authenticated;


-- ============================================================================
-- Reactivate Worker
-- ============================================================================
create or replace function app_private.reactivate_worker_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_is_deleted boolean;
begin
  select tier into v_tier from public.users where id = p_actor_user_id and is_deleted = false;
  if not found or v_tier not in ('owner', 'admin') then
    raise exception 'users.unauthorized';
  end if;

  select is_deleted into v_is_deleted from public.users where id = p_target_user_id;
  if not found or coalesce(v_is_deleted, false) = false then
    raise exception 'users.invalid_target';
  end if;

  update public.users set is_deleted = false, updated_at = p_now where id = p_target_user_id;
  update public.worker_profiles set show_card = true, updated_at = p_now where user_id = p_target_user_id;

  perform app_private.write_audit_log(
    'users',
    'users.reactivate',
    'users',
    p_target_user_id::text,
    '{}'::jsonb,
    p_target_user_id
  );
end;
$$;

create or replace function public.reactivate_worker(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_actor_user_id is null then
    raise exception 'users.unauthorized';
  end if;
  perform app_private.reactivate_worker_impl(v_actor_user_id, p_target_user_id, v_now);
end;
$$;

revoke execute on function app_private.reactivate_worker_impl(uuid, uuid, timestamptz) from public;
revoke execute on function app_private.reactivate_worker_impl(uuid, uuid, timestamptz) from anon;
revoke execute on function app_private.reactivate_worker_impl(uuid, uuid, timestamptz) from authenticated;

revoke execute on function public.reactivate_worker(uuid) from public;
revoke execute on function public.reactivate_worker(uuid) from anon;
grant execute on function public.reactivate_worker(uuid) to authenticated;


-- ============================================================================
-- Issue SP
-- ============================================================================
create or replace function app_private.issue_worker_sp_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_sp_level integer,
  p_reason text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_is_deleted boolean;
  v_clean_reason text;
  v_sp_id uuid;
begin
  select tier into v_tier from public.users where id = p_actor_user_id and is_deleted = false;
  if not found or v_tier not in ('owner', 'admin') then
    raise exception 'sp.unauthorized';
  end if;

  select is_deleted into v_is_deleted from public.users where id = p_target_user_id;
  if not found or coalesce(v_is_deleted, true) = true then
    raise exception 'sp.invalid_target';
  end if;

  if p_sp_level not in (1, 2, 3) then
    raise exception 'sp.invalid_level';
  end if;

  if p_expires_at <= p_now then
    raise exception 'sp.invalid_expires_at';
  end if;

  v_clean_reason := pg_catalog.btrim(p_reason);
  if pg_catalog.char_length(v_clean_reason) = 0 then
    raise exception 'sp.missing_reason';
  end if;

  insert into public.worker_sp_logs (
    user_id,
    sp_level,
    reason,
    issued_by,
    issued_at,
    expires_at
  ) values (
    p_target_user_id,
    p_sp_level,
    v_clean_reason,
    p_actor_user_id,
    p_now,
    p_expires_at
  ) returning id into v_sp_id;

  perform app_private.write_audit_log(
    'users',
    'users.issue_sp',
    'worker_sp_logs',
    v_sp_id::text,
    pg_catalog.jsonb_build_object(
      'sp_level', p_sp_level,
      'expires_at', p_expires_at,
      'reason', v_clean_reason
    ),
    p_target_user_id
  );

  return v_sp_id;
end;
$$;

create or replace function public.issue_worker_sp(
  p_target_user_id uuid,
  p_sp_level integer,
  p_reason text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_actor_user_id is null then
    raise exception 'sp.unauthorized';
  end if;
  return app_private.issue_worker_sp_impl(v_actor_user_id, p_target_user_id, p_sp_level, p_reason, p_expires_at, v_now);
end;
$$;

revoke execute on function app_private.issue_worker_sp_impl(uuid, uuid, integer, text, timestamptz, timestamptz) from public;
revoke execute on function app_private.issue_worker_sp_impl(uuid, uuid, integer, text, timestamptz, timestamptz) from anon;
revoke execute on function app_private.issue_worker_sp_impl(uuid, uuid, integer, text, timestamptz, timestamptz) from authenticated;

revoke execute on function public.issue_worker_sp(uuid, integer, text, timestamptz) from public;
revoke execute on function public.issue_worker_sp(uuid, integer, text, timestamptz) from anon;
grant execute on function public.issue_worker_sp(uuid, integer, text, timestamptz) to authenticated;


-- ============================================================================
-- Revoke SP
-- ============================================================================
create or replace function app_private.revoke_worker_sp_impl(
  p_actor_user_id uuid,
  p_sp_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_target_user_id uuid;
  v_revoked_by uuid;
begin
  select tier into v_tier from public.users where id = p_actor_user_id and is_deleted = false;
  if not found or v_tier not in ('owner', 'admin') then
    raise exception 'sp.unauthorized';
  end if;

  select user_id, revoked_by into v_target_user_id, v_revoked_by from public.worker_sp_logs where id = p_sp_id for update;
  
  if not found then
    raise exception 'sp.invalid_target';
  end if;

  if v_revoked_by is not null then
    raise exception 'sp.already_revoked';
  end if;

  update public.worker_sp_logs set revoked_by = p_actor_user_id, revoked_at = p_now where id = p_sp_id;

  perform app_private.write_audit_log(
    'users',
    'users.revoke_sp',
    'worker_sp_logs',
    p_sp_id::text,
    '{}'::jsonb,
    v_target_user_id
  );
end;
$$;

create or replace function public.revoke_worker_sp(p_sp_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_actor_user_id is null then
    raise exception 'sp.unauthorized';
  end if;
  perform app_private.revoke_worker_sp_impl(v_actor_user_id, p_sp_id, v_now);
end;
$$;

revoke execute on function app_private.revoke_worker_sp_impl(uuid, uuid, timestamptz) from public;
revoke execute on function app_private.revoke_worker_sp_impl(uuid, uuid, timestamptz) from anon;
revoke execute on function app_private.revoke_worker_sp_impl(uuid, uuid, timestamptz) from authenticated;

revoke execute on function public.revoke_worker_sp(uuid) from public;
revoke execute on function public.revoke_worker_sp(uuid) from anon;
grant execute on function public.revoke_worker_sp(uuid) to authenticated;
