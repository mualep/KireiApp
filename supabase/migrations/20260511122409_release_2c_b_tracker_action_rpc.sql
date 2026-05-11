-- R2C-B-02C tracker action RPC security skeleton.
-- Business transitions and data writes are intentionally deferred.

create or replace function app_private.apply_tracker_action_impl(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
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
  v_action text := nullif(pg_catalog.btrim(p_action), '');
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

  if v_action not in (
    'START',
    'ISTIRAHAT',
    'LANJUT',
    'SELESAI',
    'CUTI',
    'IZIN',
    'SAKIT'
  ) then
    raise exception 'tracker.invalid_action' using errcode = '22023';
  end if;

  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'tracker.invalid_target' using errcode = '22023';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'skeleton_only', true,
    'action', v_action,
    'target_user_id', p_target_user_id,
    'expected_version', p_expected_version,
    'requested_at', p_now,
    'deferred_to', 'R2C-B-02D/E/F'
  );
end;
$$;

comment on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz)
is 'Private SECURITY DEFINER skeleton for future tracker action mutations. R2C-B-02C validates auth and input shape only.';

revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon;
revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated;

create or replace function public.apply_tracker_action(
  p_target_user_id uuid,
  p_action text,
  p_expected_version bigint
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

  return app_private.apply_tracker_action_impl(
    v_actor_id,
    p_target_user_id,
    p_action,
    p_expected_version,
    pg_catalog.clock_timestamp()
  );
end;
$$;

comment on function public.apply_tracker_action(uuid, text, bigint)
is 'Authenticated RPC entrypoint for future tracker action mutations. R2C-B-02C delegates to the private skeleton after actor authorization.';

revoke execute on function public.apply_tracker_action(uuid, text, bigint) from public;
revoke execute on function public.apply_tracker_action(uuid, text, bigint) from anon;
grant execute on function public.apply_tracker_action(uuid, text, bigint) to authenticated;
