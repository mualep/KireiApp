import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { basename } from "node:path";

type AbsensiStatus = "none" | "hadir" | "cuti" | "sakit" | "pending" | "alpha";

const ids = {
  owner: "40000000-0000-4000-8000-000000000001",
  admin: "40000000-0000-4000-8000-000000000002",
  member: "40000000-0000-4000-8000-000000000003",
  publicTarget: "40000000-0000-4000-8000-000000000004",
  hidden: "40000000-0000-4000-8000-000000000005",
  deleted: "40000000-0000-4000-8000-000000000006",
  missingProfile: "40000000-0000-4000-8000-000000000007",
  currentDate: "40000000-0000-4000-8000-000000000008",
  invalid: "40000000-0000-4000-8000-000000000009",
  sameStatus: "40000000-0000-4000-8000-000000000010",
  hadirDeferred: "40000000-0000-4000-8000-000000000011",
  trackerCuti: "40000000-0000-4000-8000-000000000012",
  trackerHadir: "40000000-0000-4000-8000-000000000013",
  canceledRevival: "40000000-0000-4000-8000-000000000014",
  stale: "40000000-0000-4000-8000-000000000015",
  retry: "40000000-0000-4000-8000-000000000016",
  cutiExhausted: "40000000-0000-4000-8000-000000000017",
  recordsMissing: "40000000-0000-4000-8000-000000000018",
  recordsInsufficient: "40000000-0000-4000-8000-000000000019",
  auditFail: "40000000-0000-4000-8000-000000000020",
} as const;

const allowedTransitions: Array<{ before: AbsensiStatus; after: Exclude<AbsensiStatus, "none"> }> = [
  ...(["hadir", "cuti", "sakit", "pending", "alpha"] as const).map((after) => ({
    before: "none" as const,
    after,
  })),
  ...(["hadir", "sakit", "pending", "alpha"] as const).map((after) => ({
    before: "cuti" as const,
    after,
  })),
  ...(["hadir", "cuti", "pending", "alpha"] as const).map((after) => ({
    before: "sakit" as const,
    after,
  })),
  ...(["hadir", "cuti", "sakit", "alpha"] as const).map((after) => ({
    before: "pending" as const,
    after,
  })),
  ...(["hadir", "cuti", "sakit", "pending"] as const).map((after) => ({
    before: "alpha" as const,
    after,
  })),
];

const transitionCases = allowedTransitions.map((transition, index) => ({
  ...transition,
  id: makeId(101 + index),
  gid: `KRU-${String(301 + index).padStart(3, "0")}`,
  label: `${transition.before}_to_${transition.after}`,
}));

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
      "Absensi correction RPC behavior probe failed.",
      result.stdout.trim(),
      result.stderr.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

console.log("Absensi correction RPC behavior probes passed.");

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
  const fixtureUsers = [
    { id: ids.owner, email: "r3d-a-owner@example.test", tier: "owner", name: "R3D A Owner" },
    { id: ids.admin, email: "r3d-a-admin@example.test", tier: "admin", name: "R3D A Admin" },
    { id: ids.member, email: "r3d-a-member@example.test", tier: "member", name: "R3D A Member" },
    ...transitionCases.map((testCase) => ({
      id: testCase.id,
      email: `r3d-a-${testCase.label.replaceAll("_", "-")}@example.test`,
      tier: "member",
      name: `R3D A ${testCase.label}`,
    })),
    ...[
      ["publicTarget", ids.publicTarget],
      ["hidden", ids.hidden],
      ["deleted", ids.deleted],
      ["missingProfile", ids.missingProfile],
      ["currentDate", ids.currentDate],
      ["invalid", ids.invalid],
      ["sameStatus", ids.sameStatus],
      ["hadirDeferred", ids.hadirDeferred],
      ["trackerCuti", ids.trackerCuti],
      ["trackerHadir", ids.trackerHadir],
      ["canceledRevival", ids.canceledRevival],
      ["stale", ids.stale],
      ["retry", ids.retry],
      ["cutiExhausted", ids.cutiExhausted],
      ["recordsMissing", ids.recordsMissing],
      ["recordsInsufficient", ids.recordsInsufficient],
      ["auditFail", ids.auditFail],
    ].map(([label, id]) => ({
      id,
      email: `r3d-a-${label.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}@example.test`,
      tier: "member",
      name: `R3D A ${label}`,
    })),
  ];

  return String.raw`
begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'absensi rpc behavior assertion failed: %', p_message;
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
      and p.proname = 'apply_absensi_correction'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_target_user_id uuid, p_attendance_date date, p_before_status text, p_after_status text, p_expected_attendance_id uuid, p_expected_attendance_updated_at timestamp with time zone, p_reason text'
  ),
  'public apply_absensi_correction must be security definer'
);
select pg_temp.assert_true(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'apply_absensi_correction_impl'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_actor_user_id uuid, p_target_user_id uuid, p_attendance_date date, p_before_status text, p_after_status text, p_expected_attendance_id uuid, p_expected_attendance_updated_at timestamp with time zone, p_reason text, p_now timestamp with time zone'
  ),
  'private apply_absensi_correction_impl must be security definer'
);
select pg_temp.assert_true(
  (
    select p.proconfig @> array['search_path=""']
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_absensi_correction'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_target_user_id uuid, p_attendance_date date, p_before_status text, p_after_status text, p_expected_attendance_id uuid, p_expected_attendance_updated_at timestamp with time zone, p_reason text'
  ),
  'public apply_absensi_correction must set empty search_path'
);
select pg_temp.assert_true(
  (
    select p.proconfig @> array['search_path=""']
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'apply_absensi_correction_impl'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_actor_user_id uuid, p_target_user_id uuid, p_attendance_date date, p_before_status text, p_after_status text, p_expected_attendance_id uuid, p_expected_attendance_updated_at timestamp with time zone, p_reason text, p_now timestamp with time zone'
  ),
  'private apply_absensi_correction_impl must set empty search_path'
);
select pg_temp.assert_true(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.apply_absensi_correction(uuid,date,text,text,uuid,timestamptz,text)',
    'execute'
  ),
  'authenticated must execute the public absensi RPC'
);
select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.apply_absensi_correction(uuid,date,text,text,uuid,timestamptz,text)',
    'execute'
  ),
  'anon must not execute the public absensi RPC'
);
select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'app_private.apply_absensi_correction_impl(uuid,uuid,date,text,text,uuid,timestamptz,text,timestamptz)',
    'execute'
  ),
  'authenticated must not execute the private absensi RPC'
);
select pg_temp.assert_true(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.worker_absensi_corrections'::regclass
  ),
  'worker_absensi_corrections must have RLS enabled'
);

with fixture_users(id, email, tier, name) as (
  values
    ${fixtureUsers.map((user) => `('${user.id}'::uuid, '${user.email}', '${user.tier}', '${user.name}')`).join(",\n    ")}
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
    ${fixtureUsers.map((user) => `('${user.id}'::uuid, '${user.email}', '${user.tier}', '${user.name}')`).join(",\n    ")}
)
insert into public.users (id, name, email, tier, is_deleted)
select
  id,
  name,
  email,
  tier,
  id = '${ids.deleted}'::uuid
from fixture_users;

insert into public.worker_profiles (
  user_id,
  gid,
  employee_role,
  shift,
  is_flexible,
  show_card,
  cuti_stock
)
values
  ${transitionCases.map((testCase) => `('${testCase.id}'::uuid, '${testCase.gid}', 'Professional Player', 'flexible', true, true, ${initialCutiStock(testCase.before)})`).join(",\n  ")},
  ('${ids.publicTarget}'::uuid, 'KRU-401', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.hidden}'::uuid, 'KRU-402', 'Professional Player', 'flexible', true, false, 2),
  ('${ids.deleted}'::uuid, 'KRU-403', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.currentDate}'::uuid, 'KRU-404', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.invalid}'::uuid, 'KRU-405', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.sameStatus}'::uuid, 'KRU-406', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.hadirDeferred}'::uuid, 'KRU-407', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.trackerCuti}'::uuid, 'KRU-408', 'Professional Player', 'flexible', true, true, 1),
  ('${ids.trackerHadir}'::uuid, 'KRU-409', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.canceledRevival}'::uuid, 'KRU-410', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.stale}'::uuid, 'KRU-411', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.retry}'::uuid, 'KRU-412', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.cutiExhausted}'::uuid, 'KRU-413', 'Professional Player', 'flexible', true, true, 0),
  ('${ids.recordsMissing}'::uuid, 'KRU-414', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.recordsInsufficient}'::uuid, 'KRU-415', 'Professional Player', 'flexible', true, true, 2),
  ('${ids.auditFail}'::uuid, 'KRU-416', 'Professional Player', 'flexible', true, true, 2);

insert into public.worker_status (user_id)
select user_id
from public.worker_profiles
where user_id in (
  ${[...transitionCases.map((testCase) => `'${testCase.id}'::uuid`), ...Object.values(ids).filter((id) => id !== ids.owner && id !== ids.admin && id !== ids.member && id !== ids.missingProfile).map((id) => `'${id}'::uuid`)].join(",\n  ")}
);

insert into public.worker_attendance (
  user_id,
  attendance_date,
  status,
  source,
  source_action,
  created_at,
  updated_at,
  is_canceled
)
values
  ${transitionCases.filter((testCase) => testCase.before !== "none").map((testCase) => `('${testCase.id}'::uuid, '2026-06-01'::date, '${testCase.before}', 'absensi', 'absensi.correct_${testCase.before}', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false)`).join(",\n  ")},
  ('${ids.sameStatus}'::uuid, '2026-06-01'::date, 'sakit', 'absensi', 'absensi.correct_sakit', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.hadirDeferred}'::uuid, '2026-06-01'::date, 'hadir', 'tracker', 'tracker.start', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.trackerCuti}'::uuid, '2026-06-01'::date, 'cuti', 'tracker', 'tracker.cuti', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.trackerHadir}'::uuid, '2026-06-01'::date, 'hadir', 'tracker', 'tracker.start', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.canceledRevival}'::uuid, '2026-06-01'::date, 'cuti', 'tracker', 'tracker.cuti', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, true),
  ('${ids.stale}'::uuid, '2026-06-01'::date, 'sakit', 'absensi', 'absensi.correct_sakit', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.retry}'::uuid, '2026-06-01'::date, 'pending', 'absensi', 'absensi.correct_pending', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.recordsMissing}'::uuid, '2026-06-01'::date, 'sakit', 'absensi', 'absensi.correct_sakit', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false),
  ('${ids.recordsInsufficient}'::uuid, '2026-06-01'::date, 'pending', 'absensi', 'absensi.correct_pending', '2026-06-02T00:00:00Z'::timestamptz, '2026-06-02T00:00:00Z'::timestamptz, false);

insert into public.worker_records (
  user_id,
  period_month,
  alpha_count,
  sakit_days,
  pending_days,
  cuti_stock_snapshot,
  last_source,
  last_source_action
)
values
  ${transitionCases.filter((testCase) => testCase.before !== "none").map((testCase) => {
    const before = contribution(testCase.before);
    return `('${testCase.id}'::uuid, '2026-06-01'::date, ${before.alpha}, ${before.sakit}, ${before.pending}, ${testCase.before === "cuti" ? 1 : 2}, 'absensi', 'absensi.correct_${testCase.before}')`;
  }).join(",\n  ")},
  ('${ids.sameStatus}'::uuid, '2026-06-01'::date, 0, 1, 0, 2, 'absensi', 'absensi.correct_sakit'),
  ('${ids.trackerCuti}'::uuid, '2026-06-01'::date, 0, 0, 0, 1, 'tracker', 'tracker.cuti'),
  ('${ids.stale}'::uuid, '2026-06-01'::date, 0, 1, 0, 2, 'absensi', 'absensi.correct_sakit'),
  ('${ids.retry}'::uuid, '2026-06-01'::date, 0, 0, 1, 2, 'absensi', 'absensi.correct_pending'),
  ('${ids.recordsInsufficient}'::uuid, '2026-06-01'::date, 0, 0, 0, 2, 'absensi', 'absensi.correct_pending');

select pg_temp.set_auth(null);
select pg_temp.expect_error(
  'unauthenticated public absensi correction',
  'select public.apply_absensi_correction(''${ids.publicTarget}''::uuid, ''2026-06-01''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''unauthenticated attempt'')',
  'absensi.unauthenticated'
);

select pg_temp.set_auth('${ids.member}'::uuid);
select pg_temp.expect_error(
  'member public absensi correction',
  'select public.apply_absensi_correction(''${ids.publicTarget}''::uuid, ''2026-06-01''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''member attempt'')',
  'absensi.unauthorized'
);

select pg_temp.set_auth('${ids.owner}'::uuid);
select pg_temp.expect_error(
  'hidden target',
  'select public.apply_absensi_correction(''${ids.hidden}''::uuid, ''2026-06-01''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''hidden target'')',
  'absensi.invalid_target'
);
select pg_temp.expect_error(
  'deleted target',
  'select public.apply_absensi_correction(''${ids.deleted}''::uuid, ''2026-06-01''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''deleted target'')',
  'absensi.invalid_target'
);
select pg_temp.expect_error(
  'missing profile target',
  'select public.apply_absensi_correction(''${ids.missingProfile}''::uuid, ''2026-06-01''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''missing profile'')',
  'absensi.invalid_target'
);
select pg_temp.expect_error(
  'current date rejected',
  'select app_private.apply_absensi_correction_impl(''${ids.owner}''::uuid, ''${ids.currentDate}''::uuid, ''2026-06-02''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''current date'', ''2026-06-02T02:00:00Z''::timestamptz)',
  'absensi.invalid_date'
);
select pg_temp.expect_error(
  'future date rejected',
  'select app_private.apply_absensi_correction_impl(''${ids.owner}''::uuid, ''${ids.currentDate}''::uuid, ''2026-06-03''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''future date'', ''2026-06-02T02:00:00Z''::timestamptz)',
  'absensi.invalid_date'
);
select pg_temp.expect_error(
  'custom status rejected',
  'select public.apply_absensi_correction(''${ids.invalid}''::uuid, ''2026-06-01''::date, ''none'', ''training'', null::uuid, null::timestamptz, ''custom status'')',
  'absensi.invalid_input'
);
select pg_temp.expect_error(
  'same status rejected',
  'select public.apply_absensi_correction(''${ids.sameStatus}''::uuid, ''2026-06-01''::date, ''sakit'', ''sakit'', (select id from public.worker_attendance where user_id = ''${ids.sameStatus}''::uuid), (select updated_at from public.worker_attendance where user_id = ''${ids.sameStatus}''::uuid), ''same status'')',
  'absensi.invalid_transition'
);
select pg_temp.expect_error(
  'active hadir to alpha deferred',
  'select public.apply_absensi_correction(''${ids.hadirDeferred}''::uuid, ''2026-06-01''::date, ''hadir'', ''alpha'', (select id from public.worker_attendance where user_id = ''${ids.hadirDeferred}''::uuid), (select updated_at from public.worker_attendance where user_id = ''${ids.hadirDeferred}''::uuid), ''hadir deferred'')',
  'absensi.invalid_transition'
);

${transitionCases.map((testCase) => buildAllowedTransitionSql(testCase)).join("\n")}

select pg_temp.set_auth('${ids.admin}'::uuid);
select public.apply_absensi_correction(
  '${ids.trackerCuti}'::uuid,
  '2026-06-01'::date,
  'cuti',
  'alpha',
  (select id from public.worker_attendance where user_id = '${ids.trackerCuti}'::uuid),
  (select updated_at from public.worker_attendance where user_id = '${ids.trackerCuti}'::uuid),
  'admin corrects tracker cuti'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.trackerCuti}'::uuid
      and status = 'alpha'
      and source = 'absensi'
      and source_action = 'absensi.correct_alpha'
      and is_canceled = false
  )
  and exists (
    select 1
    from public.worker_profiles
    where user_id = '${ids.trackerCuti}'::uuid
      and cuti_stock = 2
  )
  and exists (
    select 1
    from public.worker_records
    where user_id = '${ids.trackerCuti}'::uuid
      and alpha_count = 1
      and cuti_stock_snapshot = 2
  ),
  'tracker-origin historical CUTI may be corrected by Admin through Absensi'
);
select pg_temp.expect_error(
  'tracker hadir remains deferred',
  'select public.apply_absensi_correction(''${ids.trackerHadir}''::uuid, ''2026-06-01''::date, ''hadir'', ''alpha'', (select id from public.worker_attendance where user_id = ''${ids.trackerHadir}''::uuid), (select updated_at from public.worker_attendance where user_id = ''${ids.trackerHadir}''::uuid), ''tracker hadir deferred'')',
  'absensi.invalid_transition'
);

select public.apply_absensi_correction(
  '${ids.canceledRevival}'::uuid,
  '2026-06-01'::date,
  'none',
  'alpha',
  null,
  null,
  'revive canceled slot'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.canceledRevival}'::uuid
      and status = 'alpha'
      and source = 'absensi'
      and source_action = 'absensi.correct_alpha'
      and is_canceled = false
  )
  and (select count(*) from public.worker_attendance where user_id = '${ids.canceledRevival}'::uuid) = 1
  and exists (
    select 1
    from public.worker_absensi_corrections
    where target_user_id = '${ids.canceledRevival}'::uuid
      and before_status = 'none'
      and before_attendance_is_canceled = true
      and before_source = 'tracker'
      and alpha_count_delta = 1
  ),
  'canceled unique slot must revive as none -> alpha with ledger context'
);

select pg_temp.expect_error(
  'stale expected timestamp conflict',
  'select public.apply_absensi_correction(''${ids.stale}''::uuid, ''2026-06-01''::date, ''sakit'', ''pending'', (select id from public.worker_attendance where user_id = ''${ids.stale}''::uuid), ''2026-06-01T00:00:00Z''::timestamptz, ''stale timestamp'')',
  'absensi.attendance_conflict'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_attendance
    where user_id = '${ids.stale}'::uuid
      and status = 'sakit'
  )
  and exists (
    select 1
    from public.worker_records
    where user_id = '${ids.stale}'::uuid
      and sakit_days = 1
      and pending_days = 0
  )
  and not exists (select 1 from public.worker_absensi_corrections where target_user_id = '${ids.stale}'::uuid),
  'stale expected timestamp must not mutate attendance, records, or ledger'
);

select public.apply_absensi_correction(
  '${ids.retry}'::uuid,
  '2026-06-01'::date,
  'pending',
  'alpha',
  (select id from public.worker_attendance where user_id = '${ids.retry}'::uuid),
  (select updated_at from public.worker_attendance where user_id = '${ids.retry}'::uuid),
  'first retry target correction'
);
select pg_temp.expect_error(
  'retry after success conflict',
  'select public.apply_absensi_correction(''${ids.retry}''::uuid, ''2026-06-01''::date, ''pending'', ''alpha'', (select id from public.worker_attendance where user_id = ''${ids.retry}''::uuid), (select updated_at from public.worker_attendance where user_id = ''${ids.retry}''::uuid), ''second retry target correction'')',
  'absensi.attendance_conflict'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_records
    where user_id = '${ids.retry}'::uuid
      and pending_days = 0
      and alpha_count = 1
  )
  and (select count(*) from public.worker_absensi_corrections where target_user_id = '${ids.retry}'::uuid) = 1
  and (select count(*) from public.audit_logs where target_user_id = '${ids.retry}'::uuid and action = 'absensi.correct') = 1,
  'retry after success must not double-apply deltas, ledger, or audit'
);

select pg_temp.expect_error(
  'cuti stock exhausted',
  'select public.apply_absensi_correction(''${ids.cutiExhausted}''::uuid, ''2026-06-01''::date, ''none'', ''cuti'', null::uuid, null::timestamptz, ''cuti exhausted'')',
  'absensi.cuti_stock_exhausted'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_attendance where user_id = '${ids.cutiExhausted}'::uuid)
  and exists (select 1 from public.worker_profiles where user_id = '${ids.cutiExhausted}'::uuid and cuti_stock = 0)
  and not exists (select 1 from public.worker_absensi_corrections where target_user_id = '${ids.cutiExhausted}'::uuid),
  'cuti exhaustion must roll back attendance, profile, records, and ledger'
);

select pg_temp.expect_error(
  'records missing closed',
  'select public.apply_absensi_correction(''${ids.recordsMissing}''::uuid, ''2026-06-01''::date, ''sakit'', ''hadir'', (select id from public.worker_attendance where user_id = ''${ids.recordsMissing}''::uuid), (select updated_at from public.worker_attendance where user_id = ''${ids.recordsMissing}''::uuid), ''records missing'')',
  'absensi.records_missing'
);
select pg_temp.expect_error(
  'records insufficient closed',
  'select public.apply_absensi_correction(''${ids.recordsInsufficient}''::uuid, ''2026-06-01''::date, ''pending'', ''hadir'', (select id from public.worker_attendance where user_id = ''${ids.recordsInsufficient}''::uuid), (select updated_at from public.worker_attendance where user_id = ''${ids.recordsInsufficient}''::uuid), ''records insufficient'')',
  'absensi.records_missing'
);
select pg_temp.assert_true(
  exists (select 1 from public.worker_attendance where user_id = '${ids.recordsMissing}'::uuid and status = 'sakit')
  and exists (select 1 from public.worker_attendance where user_id = '${ids.recordsInsufficient}'::uuid and status = 'pending')
  and not exists (
    select 1
    from public.worker_absensi_corrections
    where target_user_id in ('${ids.recordsMissing}'::uuid, '${ids.recordsInsufficient}'::uuid)
  ),
  'records failures must leave active attendance and ledger untouched'
);

select pg_temp.set_auth(null);
select pg_temp.expect_error(
  'audit failure closed',
  'select app_private.apply_absensi_correction_impl(''${ids.owner}''::uuid, ''${ids.auditFail}''::uuid, ''2026-06-01''::date, ''none'', ''alpha'', null::uuid, null::timestamptz, ''audit fail'', ''2026-06-02T02:00:00Z''::timestamptz)',
  'unauthenticated'
);
select pg_temp.assert_true(
  not exists (select 1 from public.worker_attendance where user_id = '${ids.auditFail}'::uuid)
  and not exists (select 1 from public.worker_records where user_id = '${ids.auditFail}'::uuid)
  and not exists (select 1 from public.worker_absensi_corrections where target_user_id = '${ids.auditFail}'::uuid)
  and not exists (select 1 from public.audit_logs where target_user_id = '${ids.auditFail}'::uuid),
  'audit failure must roll back attendance, records, ledger, and audit'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.worker_attendance
    where source = 'tracker'
      and status = 'alpha'
  ),
  'Absensi correction must not create tracker ALPHA rows'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.worker_status
    where user_id in (
      ${[...transitionCases.map((testCase) => `'${testCase.id}'::uuid`), `'${ids.trackerCuti}'::uuid`, `'${ids.canceledRevival}'::uuid`, `'${ids.retry}'::uuid`].join(",\n      ")}
    )
      and (
        version <> 0
        or current_status <> 'off'
        or alpha_done <> false
      )
  ),
  'Absensi correction must not mutate live worker_status'
);

rollback;
`;
}

function buildAllowedTransitionSql(testCase: (typeof transitionCases)[number]) {
  const before = contribution(testCase.before);
  const after = contribution(testCase.after);
  const cutiDelta = (testCase.before === "cuti" ? 1 : 0) + (testCase.after === "cuti" ? -1 : 0);
  const finalStock = initialCutiStock(testCase.before) + cutiDelta;
  const expectedSnapshot = cutiDelta !== 0 ? finalStock : testCase.before === "none" ? null : initialCutiStock(testCase.before);
  const expectedLedger = {
    pending: after.pending - before.pending,
    sakit: after.sakit - before.sakit,
    alpha: after.alpha - before.alpha,
    cuti: cutiDelta,
  };

  return String.raw`
select pg_temp.set_auth('${ids.owner}'::uuid);
select public.apply_absensi_correction(
  '${testCase.id}'::uuid,
  '2026-06-01'::date,
  '${testCase.before}',
  '${testCase.after}',
  ${testCase.before === "none" ? "null" : `(select id from public.worker_attendance where user_id = '${testCase.id}'::uuid)`},
  ${testCase.before === "none" ? "null" : `(select updated_at from public.worker_attendance where user_id = '${testCase.id}'::uuid)`},
  'allowed ${testCase.label}'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.worker_attendance
    where user_id = '${testCase.id}'::uuid
      and attendance_date = '2026-06-01'::date
      and status = '${testCase.after}'
      and source = 'absensi'
      and source_action = 'absensi.correct_${testCase.after}'
      and is_canceled = false
  )
  and (select count(*) from public.worker_attendance where user_id = '${testCase.id}'::uuid and attendance_date = '2026-06-01'::date) = 1
  and exists (
    select 1
    from public.worker_profiles
    where user_id = '${testCase.id}'::uuid
      and cuti_stock = ${finalStock}
  )
  and coalesce((select alpha_count from public.worker_records where user_id = '${testCase.id}'::uuid and period_month = '2026-06-01'::date), 0) = ${after.alpha}
  and coalesce((select sakit_days from public.worker_records where user_id = '${testCase.id}'::uuid and period_month = '2026-06-01'::date), 0) = ${after.sakit}
  and coalesce((select pending_days from public.worker_records where user_id = '${testCase.id}'::uuid and period_month = '2026-06-01'::date), 0) = ${after.pending}
  ${expectedSnapshot === null ? "" : `and exists (select 1 from public.worker_records where user_id = '${testCase.id}'::uuid and period_month = '2026-06-01'::date and cuti_stock_snapshot = ${expectedSnapshot})`}
  and exists (
    select 1
    from public.worker_absensi_corrections
    where target_user_id = '${testCase.id}'::uuid
      and attendance_date = '2026-06-01'::date
      and before_status = '${testCase.before}'
      and after_status = '${testCase.after}'
      and after_source = 'absensi'
      and after_source_action = 'absensi.correct_${testCase.after}'
      and pending_days_delta = ${expectedLedger.pending}
      and sakit_days_delta = ${expectedLedger.sakit}
      and alpha_count_delta = ${expectedLedger.alpha}
      and cuti_stock_delta = ${expectedLedger.cuti}
  )
  and (select count(*) from public.audit_logs where target_user_id = '${testCase.id}'::uuid and action = 'absensi.correct') = 1,
  'allowed transition ${testCase.label} must apply exact attendance, record, ledger, and audit effects'
);`;
}

function contribution(status: AbsensiStatus) {
  return {
    alpha: status === "alpha" ? 1 : 0,
    sakit: status === "sakit" ? 1 : 0,
    pending: status === "pending" ? 1 : 0,
  };
}

function initialCutiStock(status: AbsensiStatus) {
  return status === "cuti" ? 1 : 2;
}

function makeId(sequence: number) {
  return `40000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}
