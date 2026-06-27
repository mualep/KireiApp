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
      "Records override RPC behavior probe failed.",
      result.stdout.trim(),
      result.stderr.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

console.log("Records override RPC behavior probes passed.");

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
    raise exception 'records override rpc behavior assertion failed: %', p_message;
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

insert into public.worker_records (user_id, period_month, alpha_count, sakit_days, pending_days, lembur_units)
values ('${ids.target}'::uuid, '2026-06-01'::date, 0, 0, 0, 0);

select pg_temp.set_auth('${ids.member}'::uuid);
select pg_temp.expect_error(
  'member denied',
  'select public.apply_records_override(''${ids.target}''::uuid, ''2026-06-01''::date, ''sakit_override_days'', null, 1, ''test'')',
  'records.unauthorized'
);

select pg_temp.set_auth('${ids.owner}'::uuid);
select pg_temp.expect_error(
  'stale lock',
  'select public.apply_records_override(''${ids.target}''::uuid, ''2026-06-01''::date, ''sakit_override_days'', 5, 1, ''test'')',
  'records.stale_override'
);
select pg_temp.expect_error(
  'negative value',
  'select public.apply_records_override(''${ids.target}''::uuid, ''2026-06-01''::date, ''sakit_override_days'', null, -1, ''test'')',
  'records.invalid_value'
);

-- null -> value
select public.apply_records_override('${ids.target}'::uuid, '2026-06-01'::date, 'sakit_override_days', null, 2, 'test 1');
select pg_temp.assert_true(
  exists (select 1 from public.worker_records where user_id = '${ids.target}'::uuid and sakit_override_days = 2),
  'null to value should update worker_records'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_records_override_log where target_user_id = '${ids.target}'::uuid and before_value is null and after_value = 2),
  'null to value should write ledger'
);

-- value -> new value
select public.apply_records_override('${ids.target}'::uuid, '2026-06-01'::date, 'sakit_override_days', 2, 4, 'test 2');
select pg_temp.assert_true(
  exists (select 1 from public.worker_records where user_id = '${ids.target}'::uuid and sakit_override_days = 4),
  'value to new value should update worker_records'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_records_override_log where target_user_id = '${ids.target}'::uuid and before_value = 2 and after_value = 4),
  'value to new value should write ledger'
);

-- value -> null
select public.apply_records_override('${ids.target}'::uuid, '2026-06-01'::date, 'sakit_override_days', 4, null, 'test 3');
select pg_temp.assert_true(
  exists (select 1 from public.worker_records where user_id = '${ids.target}'::uuid and sakit_override_days is null),
  'value to null should update worker_records'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_records_override_log where target_user_id = '${ids.target}'::uuid and before_value = 4 and after_value is null),
  'value to null should write ledger'
);
select pg_temp.assert_true(
  (select count(*) from public.audit_logs where target_user_id = '${ids.target}'::uuid and action = 'records.override') = 3,
  'should write to audit_logs'
);

rollback;
`;
}
