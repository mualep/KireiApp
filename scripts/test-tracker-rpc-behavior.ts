import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { basename } from "node:path";

const ids = {
  owner: "10000000-0000-4000-8000-000000000001",
  admin: "10000000-0000-4000-8000-000000000002",
  member: "10000000-0000-4000-8000-000000000003",
  adminStart: "20000000-0000-4000-8000-000000000101",
  start: "20000000-0000-4000-8000-000000000102",
  stale: "20000000-0000-4000-8000-000000000103",
  late: "20000000-0000-4000-8000-000000000104",
  cycle: "20000000-0000-4000-8000-000000000105",
  cuti: "20000000-0000-4000-8000-000000000106",
  cutiZero: "20000000-0000-4000-8000-000000000107",
  izin: "20000000-0000-4000-8000-000000000108",
  sakit: "20000000-0000-4000-8000-000000000109",
  conflict: "20000000-0000-4000-8000-000000000110",
  invalidTransition: "20000000-0000-4000-8000-000000000111",
  alpha: "20000000-0000-4000-8000-000000000112",
  auditFail: "20000000-0000-4000-8000-000000000113",
  startExistingHadir: "20000000-0000-4000-8000-000000000114",
  lateExistingHadir: "20000000-0000-4000-8000-000000000115",
  startExistingCuti: "20000000-0000-4000-8000-000000000116",
  startExistingPending: "20000000-0000-4000-8000-000000000117",
  startExistingSakit: "20000000-0000-4000-8000-000000000118",
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
      "Tracker RPC behavior probe failed.",
      result.stdout.trim(),
      result.stderr.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

console.log("Tracker RPC behavior probes passed.");

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
    raise exception 'tracker rpc behavior assertion failed: %', p_message;
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

select pg_temp.assert_true(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_tracker_action'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_target_user_id uuid, p_action text, p_expected_version bigint'
  ),
  'public apply_tracker_action must be security definer'
);
select pg_temp.assert_true(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'apply_tracker_action_impl'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_actor_user_id uuid, p_target_user_id uuid, p_action text, p_expected_version bigint, p_now timestamp with time zone'
  ),
  'private apply_tracker_action_impl must be security definer'
);
select pg_temp.assert_true(
  (
    select p.proconfig @> array['search_path=""']
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_tracker_action'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_target_user_id uuid, p_action text, p_expected_version bigint'
  ),
  'public apply_tracker_action must set empty search_path'
);
select pg_temp.assert_true(
  (
    select p.proconfig @> array['search_path=""']
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'apply_tracker_action_impl'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_actor_user_id uuid, p_target_user_id uuid, p_action text, p_expected_version bigint, p_now timestamp with time zone'
  ),
  'private apply_tracker_action_impl must set empty search_path'
);
select pg_temp.assert_true(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.apply_tracker_action(uuid,text,bigint)',
    'execute'
  ),
  'authenticated must execute the public tracker RPC'
);
select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.apply_tracker_action(uuid,text,bigint)',
    'execute'
  ),
  'anon must not execute the public tracker RPC'
);
select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'app_private.apply_tracker_action_impl(uuid,uuid,text,bigint,timestamptz)',
    'execute'
  ),
  'authenticated must not execute the private tracker RPC'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'worker_status'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ),
  'authenticated must not have direct worker_status update grants'
);
select pg_temp.assert_true(
  pg_catalog.pg_get_functiondef('app_private.apply_tracker_action_impl(uuid,uuid,text,bigint,timestamptz)'::regprocedure) !~* '\mexecute\M',
  'private tracker RPC must not use dynamic SQL'
);
select pg_temp.assert_true(
  pg_catalog.pg_get_functiondef('public.apply_tracker_action(uuid,text,bigint)'::regprocedure) !~* '\mexecute\M',
  'public tracker RPC must not use dynamic SQL'
);

with fixture_users(id, email, tier, name) as (
  values
    ('${ids.owner}'::uuid, 'r2c-b-02g-owner@example.test', 'owner', 'R2C 02G Owner'),
    ('${ids.admin}'::uuid, 'r2c-b-02g-admin@example.test', 'admin', 'R2C 02G Admin'),
    ('${ids.member}'::uuid, 'r2c-b-02g-member@example.test', 'member', 'R2C 02G Member'),
    ('${ids.adminStart}'::uuid, 'r2c-b-02g-admin-start@example.test', 'member', 'R2C 02G Admin Target'),
    ('${ids.start}'::uuid, 'r2c-b-02g-start@example.test', 'member', 'R2C 02G Start'),
    ('${ids.stale}'::uuid, 'r2c-b-02g-stale@example.test', 'member', 'R2C 02G Stale'),
    ('${ids.late}'::uuid, 'r2c-b-02g-late@example.test', 'member', 'R2C 02G Late'),
    ('${ids.cycle}'::uuid, 'r2c-b-02g-cycle@example.test', 'member', 'R2C 02G Cycle'),
    ('${ids.cuti}'::uuid, 'r2c-b-02g-cuti@example.test', 'member', 'R2C 02G Cuti'),
    ('${ids.cutiZero}'::uuid, 'r2c-b-02g-cuti-zero@example.test', 'member', 'R2C 02G Cuti Zero'),
    ('${ids.izin}'::uuid, 'r2c-b-02g-izin@example.test', 'member', 'R2C 02G Izin'),
    ('${ids.sakit}'::uuid, 'r2c-b-02g-sakit@example.test', 'member', 'R2C 02G Sakit'),
    ('${ids.conflict}'::uuid, 'r2c-b-02g-conflict@example.test', 'member', 'R2C 02G Conflict'),
    ('${ids.invalidTransition}'::uuid, 'r2c-b-02g-invalid-transition@example.test', 'member', 'R2C 02G Invalid Transition'),
    ('${ids.alpha}'::uuid, 'r2c-b-02g-alpha@example.test', 'member', 'R2C 02G Alpha'),
    ('${ids.auditFail}'::uuid, 'r2c-b-02g-audit-fail@example.test', 'member', 'R2C 02G Audit Fail'),
    ('${ids.startExistingHadir}'::uuid, 'r2c-b-04b-start-existing-hadir@example.test', 'member', 'R2C 04B Start Existing Hadir'),
    ('${ids.lateExistingHadir}'::uuid, 'r2c-b-04b-late-existing-hadir@example.test', 'member', 'R2C 04B Late Existing Hadir'),
    ('${ids.startExistingCuti}'::uuid, 'r2c-b-04b-start-existing-cuti@example.test', 'member', 'R2C 04B Start Existing Cuti'),
    ('${ids.startExistingPending}'::uuid, 'r2c-b-04b-start-existing-pending@example.test', 'member', 'R2C 04B Start Existing Pending'),
    ('${ids.startExistingSakit}'::uuid, 'r2c-b-04b-start-existing-sakit@example.test', 'member', 'R2C 04B Start Existing Sakit')
)
insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  id,
  'authenticated',
  'authenticated',
  email,
  pg_catalog.clock_timestamp(),
  '{}'::jsonb,
  '{}'::jsonb,
  pg_catalog.clock_timestamp(),
  pg_catalog.clock_timestamp()
from fixture_users;

with fixture_users(id, email, tier, name) as (
  values
    ('${ids.owner}'::uuid, 'r2c-b-02g-owner@example.test', 'owner', 'R2C 02G Owner'),
    ('${ids.admin}'::uuid, 'r2c-b-02g-admin@example.test', 'admin', 'R2C 02G Admin'),
    ('${ids.member}'::uuid, 'r2c-b-02g-member@example.test', 'member', 'R2C 02G Member'),
    ('${ids.adminStart}'::uuid, 'r2c-b-02g-admin-start@example.test', 'member', 'R2C 02G Admin Target'),
    ('${ids.start}'::uuid, 'r2c-b-02g-start@example.test', 'member', 'R2C 02G Start'),
    ('${ids.stale}'::uuid, 'r2c-b-02g-stale@example.test', 'member', 'R2C 02G Stale'),
    ('${ids.late}'::uuid, 'r2c-b-02g-late@example.test', 'member', 'R2C 02G Late'),
    ('${ids.cycle}'::uuid, 'r2c-b-02g-cycle@example.test', 'member', 'R2C 02G Cycle'),
    ('${ids.cuti}'::uuid, 'r2c-b-02g-cuti@example.test', 'member', 'R2C 02G Cuti'),
    ('${ids.cutiZero}'::uuid, 'r2c-b-02g-cuti-zero@example.test', 'member', 'R2C 02G Cuti Zero'),
    ('${ids.izin}'::uuid, 'r2c-b-02g-izin@example.test', 'member', 'R2C 02G Izin'),
    ('${ids.sakit}'::uuid, 'r2c-b-02g-sakit@example.test', 'member', 'R2C 02G Sakit'),
    ('${ids.conflict}'::uuid, 'r2c-b-02g-conflict@example.test', 'member', 'R2C 02G Conflict'),
    ('${ids.invalidTransition}'::uuid, 'r2c-b-02g-invalid-transition@example.test', 'member', 'R2C 02G Invalid Transition'),
    ('${ids.alpha}'::uuid, 'r2c-b-02g-alpha@example.test', 'member', 'R2C 02G Alpha'),
    ('${ids.auditFail}'::uuid, 'r2c-b-02g-audit-fail@example.test', 'member', 'R2C 02G Audit Fail'),
    ('${ids.startExistingHadir}'::uuid, 'r2c-b-04b-start-existing-hadir@example.test', 'member', 'R2C 04B Start Existing Hadir'),
    ('${ids.lateExistingHadir}'::uuid, 'r2c-b-04b-late-existing-hadir@example.test', 'member', 'R2C 04B Late Existing Hadir'),
    ('${ids.startExistingCuti}'::uuid, 'r2c-b-04b-start-existing-cuti@example.test', 'member', 'R2C 04B Start Existing Cuti'),
    ('${ids.startExistingPending}'::uuid, 'r2c-b-04b-start-existing-pending@example.test', 'member', 'R2C 04B Start Existing Pending'),
    ('${ids.startExistingSakit}'::uuid, 'r2c-b-04b-start-existing-sakit@example.test', 'member', 'R2C 04B Start Existing Sakit')
)
insert into public.users (id, name, email, tier)
select id, name, email, tier
from fixture_users;

insert into public.worker_profiles (
  user_id,
  gid,
  employee_role,
  shift,
  is_flexible,
  cuti_stock
)
values
  ('${ids.adminStart}'::uuid, 'KRU-101', 'Professional Player', 'flexible', true, 2),
  ('${ids.start}'::uuid, 'KRU-102', 'Professional Player', 'flexible', true, 2),
  ('${ids.stale}'::uuid, 'KRU-103', 'Professional Player', 'flexible', true, 2),
  ('${ids.cycle}'::uuid, 'KRU-105', 'Professional Player', 'flexible', true, 2),
  ('${ids.cuti}'::uuid, 'KRU-106', 'Professional Player', 'flexible', true, 2),
  ('${ids.cutiZero}'::uuid, 'KRU-107', 'Professional Player', 'flexible', true, 0),
  ('${ids.izin}'::uuid, 'KRU-108', 'Professional Player', 'flexible', true, 2),
  ('${ids.sakit}'::uuid, 'KRU-109', 'Professional Player', 'flexible', true, 2),
  ('${ids.conflict}'::uuid, 'KRU-110', 'Professional Player', 'flexible', true, 2),
  ('${ids.invalidTransition}'::uuid, 'KRU-111', 'Professional Player', 'flexible', true, 2),
  ('${ids.alpha}'::uuid, 'KRU-112', 'Professional Player', 'flexible', true, 2),
  ('${ids.auditFail}'::uuid, 'KRU-113', 'Professional Player', 'flexible', true, 2),
  ('${ids.startExistingHadir}'::uuid, 'KRU-114', 'Professional Player', 'flexible', true, 2),
  ('${ids.startExistingCuti}'::uuid, 'KRU-116', 'Professional Player', 'flexible', true, 2),
  ('${ids.startExistingPending}'::uuid, 'KRU-117', 'Professional Player', 'flexible', true, 2),
  ('${ids.startExistingSakit}'::uuid, 'KRU-118', 'Professional Player', 'flexible', true, 2);

with wib as (
  select (
    pg_catalog.date_part('hour', pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::integer * 60
  ) + pg_catalog.date_part('minute', pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::integer as minute_of_day
),
late_shift as (
  select
    ((minute_of_day + 1410) % 1440) as starts_at_minute,
    ((minute_of_day + 120) % 1440) as ends_at_minute
  from wib
)
insert into public.worker_profiles (
  user_id,
  gid,
  employee_role,
  shift,
  shift_start_hour,
  shift_start_min,
  shift_end_hour,
  shift_end_min,
  is_flexible,
  cuti_stock
)
select
  '${ids.late}'::uuid,
  'KRU-104',
  'Professional Player',
  'A',
  starts_at_minute / 60,
  starts_at_minute % 60,
  ends_at_minute / 60,
  ends_at_minute % 60,
  false,
  2
from late_shift;

with wib as (
  select (
    pg_catalog.date_part('hour', pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::integer * 60
  ) + pg_catalog.date_part('minute', pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::integer as minute_of_day
),
late_shift as (
  select
    ((minute_of_day + 1410) % 1440) as starts_at_minute,
    ((minute_of_day + 120) % 1440) as ends_at_minute
  from wib
)
insert into public.worker_profiles (
  user_id,
  gid,
  employee_role,
  shift,
  shift_start_hour,
  shift_start_min,
  shift_end_hour,
  shift_end_min,
  is_flexible,
  cuti_stock
)
select
  '${ids.lateExistingHadir}'::uuid,
  'KRU-115',
  'Professional Player',
  'A',
  starts_at_minute / 60,
  starts_at_minute % 60,
  ends_at_minute / 60,
  ends_at_minute % 60,
  false,
  2
from late_shift;

insert into public.worker_status (user_id, version, current_status)
values
  ('${ids.adminStart}'::uuid, 0, 'off'),
  ('${ids.start}'::uuid, 0, 'off'),
  ('${ids.late}'::uuid, 0, 'off'),
  ('${ids.cuti}'::uuid, 0, 'off'),
  ('${ids.cutiZero}'::uuid, 0, 'off'),
  ('${ids.izin}'::uuid, 0, 'off'),
  ('${ids.sakit}'::uuid, 0, 'off'),
  ('${ids.conflict}'::uuid, 0, 'off'),
  ('${ids.auditFail}'::uuid, 0, 'off'),
  ('${ids.startExistingHadir}'::uuid, 0, 'off'),
  ('${ids.lateExistingHadir}'::uuid, 0, 'off'),
  ('${ids.startExistingCuti}'::uuid, 0, 'off'),
  ('${ids.startExistingPending}'::uuid, 0, 'off'),
  ('${ids.startExistingSakit}'::uuid, 0, 'off'),
  ('${ids.stale}'::uuid, 3, 'off'),
  ('${ids.invalidTransition}'::uuid, 0, 'on'),
  ('${ids.alpha}'::uuid, 0, 'off');

insert into public.worker_status (
  user_id,
  version,
  current_status,
  shift_active_date,
  shift_active_started_at,
  shift_active_label
)
values (
  '${ids.cycle}'::uuid,
  0,
  'on',
  (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date,
  pg_catalog.clock_timestamp(),
  'flexible'
);

update public.worker_status
set alpha_done = true
where user_id = '${ids.alpha}'::uuid;

insert into public.worker_attendance (
  user_id,
  attendance_date,
  status,
  source,
  source_action
)
values (
  '${ids.conflict}'::uuid,
  (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date,
  'hadir',
  'absensi',
  'absensi.manual'
);

insert into public.worker_attendance (
  user_id,
  attendance_date,
  status,
  source,
  source_action
)
values
  (
    '${ids.startExistingHadir}'::uuid,
    (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date,
    'hadir',
    'absensi',
    'absensi.manual'
  ),
  (
    '${ids.startExistingCuti}'::uuid,
    (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date,
    'cuti',
    'absensi',
    'absensi.manual'
  ),
  (
    '${ids.startExistingPending}'::uuid,
    (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date,
    'pending',
    'absensi',
    'absensi.manual'
  ),
  (
    '${ids.startExistingSakit}'::uuid,
    (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date,
    'sakit',
    'absensi',
    'absensi.manual'
  );

with wib as (
  select
    (pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::date as today,
    (
      pg_catalog.date_part('hour', pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::integer * 60
    ) + pg_catalog.date_part('minute', pg_catalog.clock_timestamp() at time zone 'Asia/Jakarta')::integer as minute_of_day
),
late_shift as (
  select
    today,
    minute_of_day,
    ((minute_of_day + 1410) % 1440) as starts_at_minute,
    ((minute_of_day + 120) % 1440) as ends_at_minute
  from wib
),
late_attendance as (
  select
    case
      when starts_at_minute > ends_at_minute and minute_of_day < ends_at_minute
        then today - 1
      else today
    end as attendance_date
  from late_shift
)
insert into public.worker_attendance (
  user_id,
  attendance_date,
  status,
  source,
  source_action
)
select
  '${ids.lateExistingHadir}'::uuid,
  attendance_date,
  'hadir',
  'absensi',
  'absensi.manual'
from late_attendance;

insert into public.worker_records (
  user_id,
  period_month,
  work_late_seconds,
  last_source,
  last_source_action
)
select
  '${ids.lateExistingHadir}'::uuid,
  pg_catalog.date_trunc('month', attendance_date::timestamp)::date,
  90,
  'absensi',
  'absensi.manual'
from public.worker_attendance
where user_id = '${ids.lateExistingHadir}'::uuid;

set local role authenticated;
select pg_temp.set_auth(null);
select pg_temp.expect_error(
  'unauthenticated public call',
  'select public.apply_tracker_action(''${ids.start}''::uuid, ''START'', 0::bigint)',
  'tracker.unauthenticated'
);

select pg_temp.set_auth('${ids.member}'::uuid);
select pg_temp.expect_error(
  'member public call',
  'select public.apply_tracker_action(''${ids.start}''::uuid, ''START'', 0::bigint)',
  'tracker.unauthorized'
);

select pg_temp.set_auth('${ids.admin}'::uuid);
with result as (
  select public.apply_tracker_action('${ids.adminStart}'::uuid, 'START', 0) as payload
)
select
  pg_temp.assert_true((payload->>'ok')::boolean, 'admin START should succeed'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'admin START should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.adminStart}'::uuid
      and current_status = 'on'
      and version = 1
  ),
  'admin START should move target on and increment version once'
);

select pg_temp.set_auth('${ids.owner}'::uuid);
select pg_temp.expect_error(
  'invalid action',
  'select public.apply_tracker_action(''${ids.start}''::uuid, ''BOGUS'', 0::bigint)',
  'tracker.invalid_action'
);
select pg_temp.expect_error(
  'stale expected version',
  'select public.apply_tracker_action(''${ids.stale}''::uuid, ''START'', 2::bigint)',
  'tracker.version_conflict'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_attendance where user_id = '${ids.stale}'::uuid)
  and not exists (select 1 from public.worker_records where user_id = '${ids.stale}'::uuid)
  and not exists (select 1 from public.audit_logs where target_user_id = '${ids.stale}'::uuid),
  'stale expected version must not write side effects'
);
select pg_temp.expect_error(
  'invalid transition',
  'select public.apply_tracker_action(''${ids.invalidTransition}''::uuid, ''START'', 0::bigint)',
  'tracker.invalid_transition'
);
select pg_temp.expect_error(
  'derived alpha rejection',
  'select public.apply_tracker_action(''${ids.alpha}''::uuid, ''START'', 0::bigint)',
  'tracker.alpha_rejected'
);

with result as (
  select public.apply_tracker_action('${ids.start}'::uuid, 'START', 0) as payload
)
select
  pg_temp.assert_true(payload->>'source_action' = 'tracker.start', 'START should return tracker.start'),
  pg_temp.assert_true(payload->>'attendance_status' = 'hadir', 'START should return hadir attendance'),
  pg_temp.assert_true((payload->>'to_version')::bigint = 1, 'START should increment version once'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'START should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.start}'::uuid
      and current_status = 'on'
      and version = 1
      and shift_active_date is not null
      and shift_active_started_at is not null
  ),
  'START should move worker_status to on'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.start}'::uuid
      and status = 'hadir'
      and source = 'tracker'
      and source_action = 'tracker.start'
  ),
  'START should create hadir tracker attendance'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_records where user_id = '${ids.start}'::uuid),
  'non-late START should not create worker_records'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    where al.actor_user_id = '${ids.owner}'::uuid
      and al.target_user_id = '${ids.start}'::uuid
      and al.domain = 'tracker'
      and al.action = 'tracker.start'
      and al.payload_json->'summary'->>'action' = 'tracker.start'
  ),
  'START should write matching audit row'
);
select pg_temp.expect_error(
  'old START retry',
  'select public.apply_tracker_action(''${ids.start}''::uuid, ''START'', 0::bigint)',
  'tracker.version_conflict'
);
select pg_temp.assert_true(
  (select count(*) from public.worker_attendance where user_id = '${ids.start}'::uuid) = 1
  and (select count(*) from public.audit_logs where target_user_id = '${ids.start}'::uuid) = 1,
  'old START retry must not duplicate attendance or audit'
);

with result as (
  select public.apply_tracker_action('${ids.startExistingHadir}'::uuid, 'START', 0) as payload
)
select
  pg_temp.assert_true(payload->>'source_action' = 'tracker.start', 'START existing hadir should return tracker.start'),
  pg_temp.assert_true(payload->>'attendance_status' = 'hadir', 'START existing hadir should return hadir attendance'),
  pg_temp.assert_true((payload->>'attendance_reused')::boolean, 'START existing hadir should report reused attendance'),
  pg_temp.assert_true((payload->>'work_late_seconds_delta')::integer = 0, 'START existing hadir should be zero-delta'),
  pg_temp.assert_true((payload->>'to_version')::bigint = 1, 'START existing hadir should increment version once'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'START existing hadir should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.startExistingHadir}'::uuid
      and current_status = 'on'
      and version = 1
  ),
  'START existing hadir should move worker_status to on'
);
select pg_temp.assert_true(
  (select count(*) from public.worker_attendance where user_id = '${ids.startExistingHadir}'::uuid) = 1
  and exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.startExistingHadir}'::uuid
      and status = 'hadir'
      and source = 'absensi'
      and source_action = 'absensi.manual'
  ),
  'START existing hadir must reuse attendance without duplicate insert'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_records where user_id = '${ids.startExistingHadir}'::uuid),
  'non-late START existing hadir should not create worker_records'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    where al.actor_user_id = '${ids.owner}'::uuid
      and al.target_user_id = '${ids.startExistingHadir}'::uuid
      and al.action = 'tracker.start'
      and (al.payload_json->'summary'->>'attendance_reused')::boolean
  ),
  'START existing hadir should audit attendance reuse'
);

with result as (
  select public.apply_tracker_action('${ids.late}'::uuid, 'START', 0) as payload
)
select
  pg_temp.assert_true(payload->>'display_status_before' = 'LATE', 'late START should derive LATE display status'),
  pg_temp.assert_true(payload->>'source_action' = 'tracker.start_late', 'late START should return tracker.start_late'),
  pg_temp.assert_true((payload->>'work_late_seconds_delta')::integer > 0, 'late START should compute positive late seconds'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'late START should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_records as wr
    where wr.user_id = '${ids.late}'::uuid
      and wr.work_late_seconds > 0
      and wr.break_late_seconds = 0
      and wr.last_source = 'tracker'
      and wr.last_source_action = 'tracker.start_late'
  ),
  'late START should increment only work_late_seconds'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    join public.worker_records as wr
      on wr.user_id = al.target_user_id
    where al.target_user_id = '${ids.late}'::uuid
      and al.action = 'tracker.start_late'
      and (al.payload_json->'summary'->'record_deltas'->>'work_late_seconds')::integer = wr.work_late_seconds
  ),
  'late START should write precise audit record_deltas'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.late}'::uuid
      and status = 'hadir'
      and source_action = 'tracker.start_late'
  ),
  'late START should create hadir attendance'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_status where current_status = 'late')
  and not exists (select 1 from public.worker_attendance where status = 'late'),
  'LATE must never be stored'
);
select pg_temp.expect_error(
  'old late START retry',
  'select public.apply_tracker_action(''${ids.late}''::uuid, ''START'', 0::bigint)',
  'tracker.version_conflict'
);
select pg_temp.assert_true(
  (select count(*) from public.worker_attendance where user_id = '${ids.late}'::uuid) = 1
  and (select count(*) from public.worker_records where user_id = '${ids.late}'::uuid) = 1
  and (select count(*) from public.audit_logs where target_user_id = '${ids.late}'::uuid) = 1,
  'old late START retry must not duplicate side effects'
);

with result as (
  select public.apply_tracker_action('${ids.lateExistingHadir}'::uuid, 'START', 0) as payload
)
select
  pg_temp.assert_true(payload->>'display_status_before' = 'LATE', 'late START existing hadir should derive LATE display status'),
  pg_temp.assert_true(payload->>'source_action' = 'tracker.start_late', 'late START existing hadir should return tracker.start_late'),
  pg_temp.assert_true((payload->>'attendance_reused')::boolean, 'late START existing hadir should report reused attendance'),
  pg_temp.assert_true((payload->>'work_late_seconds_delta')::integer = 0, 'late START existing hadir should not add late seconds'),
  pg_temp.assert_true((payload->>'to_version')::bigint = 1, 'late START existing hadir should increment version once'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'late START existing hadir should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.lateExistingHadir}'::uuid
      and current_status = 'on'
      and version = 1
  ),
  'late START existing hadir should move worker_status to on'
);
select pg_temp.assert_true(
  (select count(*) from public.worker_attendance where user_id = '${ids.lateExistingHadir}'::uuid) = 1
  and exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.lateExistingHadir}'::uuid
      and status = 'hadir'
      and source = 'absensi'
      and source_action = 'absensi.manual'
  ),
  'late START existing hadir must reuse attendance without duplicate insert'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_records
    where user_id = '${ids.lateExistingHadir}'::uuid
      and work_late_seconds = 90
      and break_late_seconds = 0
      and last_source = 'absensi'
      and last_source_action = 'absensi.manual'
  ),
  'late START existing hadir must not double increment work_late_seconds'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    where al.actor_user_id = '${ids.owner}'::uuid
      and al.target_user_id = '${ids.lateExistingHadir}'::uuid
      and al.action = 'tracker.start_late'
      and (al.payload_json->'summary'->>'attendance_reused')::boolean
      and al.payload_json->'summary'->'record_deltas' = '{}'::jsonb
  ),
  'late START existing hadir should audit reuse without record_deltas'
);
select pg_temp.expect_error(
  'START existing cuti attendance',
  'select public.apply_tracker_action(''${ids.startExistingCuti}''::uuid, ''START'', 0::bigint)',
  'tracker.attendance_conflict'
);
select pg_temp.expect_error(
  'START existing pending attendance',
  'select public.apply_tracker_action(''${ids.startExistingPending}''::uuid, ''START'', 0::bigint)',
  'tracker.attendance_conflict'
);
select pg_temp.expect_error(
  'START existing sakit attendance',
  'select public.apply_tracker_action(''${ids.startExistingSakit}''::uuid, ''START'', 0::bigint)',
  'tracker.attendance_conflict'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_status where user_id = '${ids.startExistingCuti}'::uuid and current_status = 'off' and version = 0)
  and exists (select 1 from public.worker_status where user_id = '${ids.startExistingPending}'::uuid and current_status = 'off' and version = 0)
  and exists (select 1 from public.worker_status where user_id = '${ids.startExistingSakit}'::uuid and current_status = 'off' and version = 0)
  and not exists (
    select 1
    from public.audit_logs
    where target_user_id in (
      '${ids.startExistingCuti}'::uuid,
      '${ids.startExistingPending}'::uuid,
      '${ids.startExistingSakit}'::uuid
    )
  ),
  'START existing non-hadir attendance must not write side effects'
);

with result as (
  select public.apply_tracker_action('${ids.cycle}'::uuid, 'ISTIRAHAT', 0) as payload
)
select
  pg_temp.assert_true(payload->>'source_action' is null, 'ISTIRAHAT should not return attendance source action'),
  pg_temp.assert_true((payload->>'to_version')::bigint = 1, 'ISTIRAHAT should increment version once')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.cycle}'::uuid
      and current_status = 'break'
      and version = 1
      and break_started_at is not null
      and break_timer_running = true
  ),
  'ISTIRAHAT should move on to break'
);
with result as (
  select public.apply_tracker_action('${ids.cycle}'::uuid, 'LANJUT', 1) as payload
)
select pg_temp.assert_true((payload->>'to_version')::bigint = 2, 'LANJUT should increment version once')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.cycle}'::uuid
      and current_status = 'on'
      and version = 2
      and break_started_at is null
      and break_timer_running = false
      and break_accumulated_secs >= 0
  ),
  'LANJUT should move break to on'
);
with result as (
  select public.apply_tracker_action('${ids.cycle}'::uuid, 'SELESAI', 2) as payload
)
select pg_temp.assert_true((payload->>'to_version')::bigint = 3, 'SELESAI should increment version once')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_status
    where user_id = '${ids.cycle}'::uuid
      and current_status = 'off'
      and version = 3
      and shift_active_date is null
      and shift_active_started_at is null
      and shift_active_label is null
      and break_started_at is null
      and break_timer_running = false
      and break_accumulated_secs = 0
  ),
  'SELESAI should clear active and break fields'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_attendance where user_id = '${ids.cycle}'::uuid)
  and not exists (select 1 from public.worker_records where user_id = '${ids.cycle}'::uuid)
  and exists (select 1 from public.audit_logs where target_user_id = '${ids.cycle}'::uuid and action = 'tracker.break_start')
  and exists (select 1 from public.audit_logs where target_user_id = '${ids.cycle}'::uuid and action = 'tracker.break_end')
  and exists (select 1 from public.audit_logs where target_user_id = '${ids.cycle}'::uuid and action = 'tracker.finish'),
  'status-only actions should audit without attendance or records'
);

with result as (
  select public.apply_tracker_action('${ids.cuti}'::uuid, 'CUTI', 0) as payload
)
select
  pg_temp.assert_true(payload->>'attendance_status' = 'cuti', 'CUTI should return cuti attendance'),
  pg_temp.assert_true((payload->>'cuti_stock_after')::integer = 1, 'CUTI should return post-decrement stock'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'CUTI should return audit_id')
from result;
select pg_temp.assert_true(
  exists (select 1 from public.worker_profiles where user_id = '${ids.cuti}'::uuid and cuti_stock = 1)
  and exists (select 1 from public.worker_status where user_id = '${ids.cuti}'::uuid and current_status = 'cuti' and version = 1 and cuti_set_date is not null)
  and exists (select 1 from public.worker_attendance where user_id = '${ids.cuti}'::uuid and status = 'cuti' and source_action = 'tracker.cuti')
  and exists (select 1 from public.worker_records where user_id = '${ids.cuti}'::uuid and cuti_stock_snapshot = 1),
  'CUTI should update stock, status, attendance, and records'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    where al.target_user_id = '${ids.cuti}'::uuid
      and al.action = 'tracker.cuti'
      and (al.payload_json->'summary'->>'cuti_stock_delta')::integer = -1
      and (al.payload_json->'summary'->>'cuti_stock_after')::integer = 1
      and (al.payload_json->'summary'->>'cuti_stock_snapshot_after')::integer = 1
  ),
  'CUTI should write stock audit payload'
);
select pg_temp.expect_error(
  'zero CUTI stock',
  'select public.apply_tracker_action(''${ids.cutiZero}''::uuid, ''CUTI'', 0::bigint)',
  'tracker.cuti_stock_exhausted'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_profiles where user_id = '${ids.cutiZero}'::uuid and cuti_stock = 0)
  and exists (select 1 from public.worker_status where user_id = '${ids.cutiZero}'::uuid and current_status = 'off' and version = 0)
  and not exists (select 1 from public.worker_attendance where user_id = '${ids.cutiZero}'::uuid)
  and not exists (select 1 from public.worker_records where user_id = '${ids.cutiZero}'::uuid)
  and not exists (select 1 from public.audit_logs where target_user_id = '${ids.cutiZero}'::uuid),
  'zero CUTI stock should not write side effects'
);

with result as (
  select public.apply_tracker_action('${ids.izin}'::uuid, 'IZIN', 0) as payload
)
select
  pg_temp.assert_true(payload->>'to_status' = 'pending', 'IZIN should return pending status'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'IZIN should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    where al.target_user_id = '${ids.izin}'::uuid
      and al.action = 'tracker.izin'
      and (al.payload_json->'summary'->'record_deltas'->>'pending_days')::integer = 1
  ),
  'IZIN should write pending audit delta'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_status where user_id = '${ids.izin}'::uuid and current_status = 'pending' and version = 1 and pending_started_at is not null)
  and exists (select 1 from public.worker_attendance where user_id = '${ids.izin}'::uuid and status = 'pending' and source_action = 'tracker.izin')
  and exists (select 1 from public.worker_records where user_id = '${ids.izin}'::uuid and pending_days = 1),
  'IZIN should map to pending status, attendance, and records'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_status where current_status = 'izin')
  and not exists (select 1 from public.worker_attendance where status = 'izin'),
  'IZIN must never be stored'
);

with result as (
  select public.apply_tracker_action('${ids.sakit}'::uuid, 'SAKIT', 0) as payload
)
select
  pg_temp.assert_true(payload->>'to_status' = 'sakit', 'SAKIT should return sakit status'),
  pg_temp.assert_true(payload->>'audit_id' is not null, 'SAKIT should return audit_id')
from result;
select pg_temp.assert_true(
  exists (
    select 1
    from public.audit_logs as al
    where al.target_user_id = '${ids.sakit}'::uuid
      and al.action = 'tracker.sakit'
      and (al.payload_json->'summary'->'record_deltas'->>'sakit_days')::integer = 1
  ),
  'SAKIT should write sakit audit delta'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_status where user_id = '${ids.sakit}'::uuid and current_status = 'sakit' and version = 1 and sakit_started_at is not null)
  and exists (select 1 from public.worker_attendance where user_id = '${ids.sakit}'::uuid and status = 'sakit' and source_action = 'tracker.sakit')
  and exists (select 1 from public.worker_records where user_id = '${ids.sakit}'::uuid and sakit_days = 1),
  'SAKIT should map to sakit status, attendance, and records'
);

select pg_temp.expect_error(
  'attendance conflict before CUTI stock decrement',
  'select public.apply_tracker_action(''${ids.conflict}''::uuid, ''CUTI'', 0::bigint)',
  'tracker.attendance_conflict'
);
select pg_temp.expect_error(
  'attendance conflict before IZIN records',
  'select public.apply_tracker_action(''${ids.conflict}''::uuid, ''IZIN'', 0::bigint)',
  'tracker.attendance_conflict'
);
select pg_temp.expect_error(
  'attendance conflict before SAKIT records',
  'select public.apply_tracker_action(''${ids.conflict}''::uuid, ''SAKIT'', 0::bigint)',
  'tracker.attendance_conflict'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_profiles where user_id = '${ids.conflict}'::uuid and cuti_stock = 2)
  and exists (select 1 from public.worker_status where user_id = '${ids.conflict}'::uuid and current_status = 'off' and version = 0)
  and (select count(*) from public.worker_attendance where user_id = '${ids.conflict}'::uuid) = 1
  and not exists (select 1 from public.worker_records where user_id = '${ids.conflict}'::uuid)
  and not exists (select 1 from public.audit_logs where target_user_id = '${ids.conflict}'::uuid),
  'attendance conflict must happen before stock, records, status, or audit changes'
);

reset role;
select pg_temp.set_auth(null);
select pg_temp.expect_error(
  'private audit fail closed rollback',
  'select app_private.apply_tracker_action_impl(''${ids.owner}''::uuid, ''${ids.auditFail}''::uuid, ''START'', 0::bigint, pg_catalog.clock_timestamp())',
  'unauthenticated'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_status where user_id = '${ids.auditFail}'::uuid and current_status = 'off' and version = 0)
  and not exists (select 1 from public.worker_attendance where user_id = '${ids.auditFail}'::uuid)
  and not exists (select 1 from public.worker_records where user_id = '${ids.auditFail}'::uuid)
  and not exists (select 1 from public.audit_logs where target_user_id = '${ids.auditFail}'::uuid),
  'audit writer failure must roll back private tracker mutation'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.worker_attendance
    where source = 'tracker'
      and status = 'alpha'
  ),
  'tracker must not create ALPHA attendance'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_records where break_late_seconds <> 0),
  'tracker behavior probe must not write break_late_seconds'
);

rollback;
`;
}
