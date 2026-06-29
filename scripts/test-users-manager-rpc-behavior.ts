import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { basename } from "node:path";

const ids = {
  owner: "40000000-0000-4000-8000-000000000001",
  admin: "40000000-0000-4000-8000-000000000002",
  member: "40000000-0000-4000-8000-000000000003",
  target: "40000000-0000-4000-8000-000000000004",
} as const;

const dbContainer = findLocalSupabaseDbContainer();
const result = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    dbContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-X",
    "-q",
  ],
  {
    encoding: "utf8",
    input: buildProbeSql(),
    maxBuffer: 1024 * 1024 * 12,
  },
);

if (result.status !== 0) {
  throw new Error(
    [
      "Users Manager RPC behavior probe failed.",
      result.stdout.trim(),
      result.stderr.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

console.log("Users Manager RPC behavior probes passed.");

function findLocalSupabaseDbContainer() {
  const projectName = basename(process.cwd());
  const preferredName = `supabase_db_${projectName}`;
  const dockerOutput = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  });
  const containerNames = dockerOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (containerNames.includes(preferredName)) {
    return preferredName;
  }

  const supabaseDbContainers = containerNames.filter((name) => name.startsWith("supabase_db_"));

  assert.equal(
    supabaseDbContainers.length,
    1,
    `Expected one local Supabase DB container, found: ${supabaseDbContainers.join(", ") || "none"}`,
  );

  return supabaseDbContainers[0];
}

function buildProbeSql() {
  return String.raw`
begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'users manager rpc behavior assertion failed: %', p_message;
  end if;
end;
$$;

create function pg_temp.expect_error(
  p_label text,
  p_statement text,
  p_expected_message text
)
returns void
language plpgsql
as $$
begin
  begin
    execute p_statement;
  exception
    when others then
      if sqlerrm = p_expected_message then
        return;
      end if;

      raise exception 'expected % for %, got % (%)',
        p_expected_message,
        p_label,
        sqlerrm,
        sqlstate;
  end;

  raise exception 'expected % for %, but statement succeeded', p_expected_message, p_label;
end;
$$;

create function pg_temp.set_auth(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', coalesce(p_user_id::text, ''), true);
  perform pg_catalog.set_config(
    'request.jwt.claims',
    case
      when p_user_id is null then ''
      else pg_catalog.jsonb_build_object('sub', p_user_id::text, 'role', 'authenticated')::text
    end,
    true
  );
end;
$$;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${ids.owner}'::uuid, 'authenticated', 'authenticated', 'owner@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()),
  ('${ids.admin}'::uuid, 'authenticated', 'authenticated', 'admin@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()),
  ('${ids.member}'::uuid, 'authenticated', 'authenticated', 'member@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()),
  ('${ids.target}'::uuid, 'authenticated', 'authenticated', 'target@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp());

insert into public.users (id, name, email, tier, is_deleted)
values
  ('${ids.owner}'::uuid, 'Owner', 'owner@example.test', 'owner', false),
  ('${ids.admin}'::uuid, 'Admin', 'admin@example.test', 'admin', false),
  ('${ids.member}'::uuid, 'Member', 'member@example.test', 'member', false),
  ('${ids.target}'::uuid, 'Target', 'target@example.test', 'member', false);

insert into public.worker_profiles (user_id, gid, employee_role, shift, is_flexible, show_card, cuti_stock)
values ('${ids.target}'::uuid, 'KRU-999', 'Professional Player', 'flexible', true, true, 2);

-- ============================================================================
-- Security Tests (Member should be rejected)
-- ============================================================================
select pg_temp.set_auth('${ids.member}'::uuid);

select pg_temp.expect_error(
  'member denied deactivate_worker',
  'select public.deactivate_worker(''${ids.target}''::uuid)',
  'users.unauthorized'
);

select pg_temp.expect_error(
  'member denied reactivate_worker',
  'select public.reactivate_worker(''${ids.target}''::uuid)',
  'users.unauthorized'
);

select pg_temp.expect_error(
  'member denied issue_worker_sp',
  'select public.issue_worker_sp(''${ids.target}''::uuid, 1, ''test'', pg_catalog.clock_timestamp() + interval ''1 day'')',
  'sp.unauthorized'
);

select pg_temp.expect_error(
  'member denied revoke_worker_sp',
  'select public.revoke_worker_sp(gen_random_uuid())',
  'sp.unauthorized'
);

-- ============================================================================
-- Issue SP
-- ============================================================================
select pg_temp.set_auth('${ids.admin}'::uuid);

-- Invalid level
select pg_temp.expect_error(
  'invalid sp level',
  'select public.issue_worker_sp(''${ids.target}''::uuid, 4, ''test'', pg_catalog.clock_timestamp() + interval ''1 day'')',
  'sp.invalid_level'
);

-- Missing reason
select pg_temp.expect_error(
  'missing reason',
  'select public.issue_worker_sp(''${ids.target}''::uuid, 1, ''  '', pg_catalog.clock_timestamp() + interval ''1 day'')',
  'sp.missing_reason'
);

-- Invalid expires_at
select pg_temp.expect_error(
  'expires_at in past',
  'select public.issue_worker_sp(''${ids.target}''::uuid, 1, ''test'', pg_catalog.clock_timestamp() - interval ''1 day'')',
  'sp.invalid_expires_at'
);

-- Valid issuance
do $$
declare
  v_sp_id uuid;
begin
  select public.issue_worker_sp('${ids.target}'::uuid, 1, 'Test reason', pg_catalog.clock_timestamp() + interval '30 days') into v_sp_id;
  
  perform pg_temp.assert_true(
    exists (
      select 1 from public.worker_sp_logs 
      where id = v_sp_id 
        and sp_level = 1 
        and reason = 'Test reason' 
        and issued_by = '${ids.admin}'::uuid 
        and expires_at > now()
        and revoked_by is null
    ),
    'SP should be issued correctly'
  );

  perform pg_temp.assert_true(
    (select count(*) from public.audit_logs where action = 'users.issue_sp') = 1,
    'SP issuance should write to audit log'
  );
end;
$$;

-- ============================================================================
-- Revoke SP
-- ============================================================================
do $$
declare
  v_sp_id uuid;
begin
  -- Issue an SP as Admin
  perform pg_temp.set_auth('${ids.admin}'::uuid);
  select public.issue_worker_sp('${ids.target}'::uuid, 2, 'To be revoked', pg_catalog.clock_timestamp() + interval '30 days') into v_sp_id;
  
  -- Revoke as Owner
  perform pg_temp.set_auth('${ids.owner}'::uuid);
  perform public.revoke_worker_sp(v_sp_id);

  perform pg_temp.assert_true(
    exists (
      select 1 from public.worker_sp_logs 
      where id = v_sp_id 
        and revoked_by = '${ids.owner}'::uuid 
        and revoked_at is not null
    ),
    'SP should be revoked with correct fields'
  );

  perform pg_temp.assert_true(
    (select count(*) from public.audit_logs where action = 'users.revoke_sp') = 1,
    'SP revocation should write to audit log'
  );

  -- Already revoked
  perform pg_temp.expect_error(
    'already revoked',
    format('select public.revoke_worker_sp(%L::uuid)', v_sp_id),
    'sp.already_revoked'
  );
end;
$$;

-- ============================================================================
-- Deactivate Worker
-- ============================================================================
select pg_temp.set_auth('${ids.owner}'::uuid);
select public.deactivate_worker('${ids.target}'::uuid);

select pg_temp.assert_true(
  exists (select 1 from public.users where id = '${ids.target}'::uuid and is_deleted = true),
  'target user is_deleted should be true'
);

select pg_temp.assert_true(
  exists (select 1 from public.worker_profiles where user_id = '${ids.target}'::uuid and show_card = false),
  'target worker_profile show_card should be false'
);

select pg_temp.assert_true(
  (select count(*) from public.audit_logs where action = 'users.deactivate') = 1,
  'deactivate should write to audit log'
);

-- Action on deleted user should fail
select pg_temp.expect_error(
  'deactivate already deleted',
  'select public.deactivate_worker(''${ids.target}''::uuid)',
  'users.invalid_target'
);

select pg_temp.expect_error(
  'issue SP to deleted user',
  'select public.issue_worker_sp(''${ids.target}''::uuid, 1, ''test'', pg_catalog.clock_timestamp() + interval ''1 day'')',
  'sp.invalid_target'
);

-- ============================================================================
-- Reactivate Worker
-- ============================================================================
select pg_temp.set_auth('${ids.admin}'::uuid);
select public.reactivate_worker('${ids.target}'::uuid);

select pg_temp.assert_true(
  exists (select 1 from public.users where id = '${ids.target}'::uuid and is_deleted = false),
  'target user is_deleted should be false'
);

select pg_temp.assert_true(
  exists (select 1 from public.worker_profiles where user_id = '${ids.target}'::uuid and show_card = true),
  'target worker_profile show_card should be true'
);

select pg_temp.assert_true(
  (select count(*) from public.audit_logs where action = 'users.reactivate') = 1,
  'reactivate should write to audit log'
);

-- Reactivate already active
select pg_temp.expect_error(
  'reactivate active user',
  'select public.reactivate_worker(''${ids.target}''::uuid)',
  'users.invalid_target'
);

rollback;
`;
}
