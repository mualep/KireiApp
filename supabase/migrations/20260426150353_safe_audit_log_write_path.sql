-- R1-10C-A: approved audit write path for app mutations.
-- Keep public.audit_logs read/write access locked down and expose only a
-- narrow RPC wrapper for authenticated staff sessions.

revoke insert, update, delete on public.audit_logs from anon, authenticated;

create or replace function app_private.write_audit_log(
  p_domain text,
  p_action text,
  p_target_table text default null,
  p_target_id text default null,
  p_payload jsonb default '{}'::jsonb,
  p_target_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_tier text;
  v_audit_id uuid;
  v_domain text := nullif(btrim(p_domain), '');
  v_action text := nullif(btrim(p_action), '');
  v_target_table text := nullif(btrim(p_target_table), '');
  v_target_id text := nullif(btrim(p_target_id), '');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if v_actor_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select u.tier
    into v_actor_tier
  from public.users as u
  where u.id = v_actor_id
    and u.is_deleted = false
    and u.tier in ('owner', 'admin', 'member')
  limit 1;

  if v_actor_tier is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if v_domain is null or v_action is null then
    raise exception 'invalid audit metadata' using errcode = '22023';
  end if;

  if length(v_domain) > 80 or v_domain !~ '^[a-z][a-z0-9_.-]*$' then
    raise exception 'invalid audit domain' using errcode = '22023';
  end if;

  if length(v_action) > 120 or v_action !~ '^[a-z][a-z0-9_.-]*$' then
    raise exception 'invalid audit action' using errcode = '22023';
  end if;

  if v_target_table is not null and (length(v_target_table) > 120 or v_target_table !~ '^[a-z][a-z0-9_.-]*$') then
    raise exception 'invalid audit target table' using errcode = '22023';
  end if;

  if v_target_id is not null and length(v_target_id) > 160 then
    raise exception 'invalid audit target id' using errcode = '22023';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'audit payload must be an object' using errcode = '22023';
  end if;

  if pg_catalog.octet_length(v_payload::text) > 12000 then
    raise exception 'audit payload too large' using errcode = '22023';
  end if;

  if lower(v_payload::text) ~ '(password|passphrase|secret|service_role|credential|api_key|token)' then
    raise exception 'unsafe audit payload' using errcode = '22023';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    target_user_id,
    domain,
    action,
    payload_json
  )
  values (
    v_actor_id,
    p_target_user_id,
    v_domain,
    v_action,
    jsonb_strip_nulls(
      jsonb_build_object(
        'target_table', v_target_table,
        'target_id', v_target_id,
        'summary', v_payload
      )
    )
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$$;

comment on function app_private.write_audit_log(text, text, text, text, jsonb, uuid)
is 'Approved private SECURITY DEFINER audit insert path for app mutations. Uses auth.uid(), validates active staff, and avoids direct audit_logs insert grants.';

revoke execute on function app_private.write_audit_log(text, text, text, text, jsonb, uuid) from public;
revoke execute on function app_private.write_audit_log(text, text, text, text, jsonb, uuid) from anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.write_audit_log(text, text, text, text, jsonb, uuid) to authenticated;

create or replace function public.write_audit_log(
  p_domain text,
  p_action text,
  p_target_table text default null,
  p_target_id text default null,
  p_payload jsonb default '{}'::jsonb,
  p_target_user_id uuid default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.write_audit_log(
    p_domain,
    p_action,
    p_target_table,
    p_target_id,
    p_payload,
    p_target_user_id
  );
$$;

comment on function public.write_audit_log(text, text, text, text, jsonb, uuid)
is 'Authenticated RPC wrapper for the private audit write path. This function performs no direct table writes and delegates validation/insertion to app_private.write_audit_log.';

revoke execute on function public.write_audit_log(text, text, text, text, jsonb, uuid) from public;
revoke execute on function public.write_audit_log(text, text, text, text, jsonb, uuid) from anon;
grant execute on function public.write_audit_log(text, text, text, text, jsonb, uuid) to authenticated;
