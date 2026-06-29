import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { basename } from "node:path";

const ids = {
  admin: "40000000-0000-4000-8000-000000000002",
  worker1: "40000000-0000-4000-8000-000000000010",
  worker2: "40000000-0000-4000-8000-000000000020",
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
      "Cron RPC behavior probe failed.",
      result.stdout.trim(),
      result.stderr.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

console.log("Cron RPC behavior probes passed successfully.");

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
    raise exception 'cron rpc behavior assertion failed: %', p_message;
  end if;
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

-- Setup test users
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${ids.admin}'::uuid, 'authenticated', 'authenticated', 'admin@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()),
  ('${ids.worker1}'::uuid, 'authenticated', 'authenticated', 'worker1@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()),
  ('${ids.worker2}'::uuid, 'authenticated', 'authenticated', 'worker2@example.test', pg_catalog.clock_timestamp(), '{}'::jsonb, '{}'::jsonb, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp());

insert into public.users (id, name, email, tier, is_deleted)
values
  ('${ids.admin}'::uuid, 'Admin', 'admin@example.test', 'admin', false),
  ('${ids.worker1}'::uuid, 'Worker 1', 'worker1@example.test', 'member', false),
  ('${ids.worker2}'::uuid, 'Worker 2', 'worker2@example.test', 'member', false);

-- Setup profiles
-- Worker 1: Shift A (06:00 to 14:00)
insert into public.worker_profiles (user_id, employee_role, shift, is_flexible, show_card, cuti_stock, shift_start_hour, shift_start_min, shift_end_hour, shift_end_min)
values ('${ids.worker1}'::uuid, 'Professional Player', 'A', false, true, 5, 6, 0, 14, 0);

-- Worker 2: Flexible
insert into public.worker_profiles (user_id, employee_role, shift, is_flexible, show_card, cuti_stock, shift_start_hour, shift_start_min, shift_end_hour, shift_end_min)
values ('${ids.worker2}'::uuid, 'Cleaning Service', 'flexible', true, true, 5, null, null, null, null);

-- Setup statuses
insert into public.worker_status (user_id, current_status)
values
  ('${ids.worker1}'::uuid, 'off'),
  ('${ids.worker2}'::uuid, 'off');

-- Enable auth context as Admin/service_role
select pg_temp.set_auth('${ids.admin}'::uuid);

-- TEST AUTO_ALPHA (Shift starts at 06:00, ends at 14:00. Time is 14:05)
-- Calling execute_cron_state_machine with timestamp 2026-06-29 14:05:00 WIB
select public.execute_cron_state_machine('2026-06-29 14:05:00+07'::timestamptz);

-- Verify worker 1 got AUTO_ALPHA
select pg_temp.assert_true(
  (select alpha_done from public.worker_status where user_id = '${ids.worker1}'::uuid),
  'worker 1 alpha_done should be true after shift end'
);

select pg_temp.assert_true(
  exists (select 1 from public.worker_attendance where user_id = '${ids.worker1}'::uuid and attendance_date = '2026-06-29'::date and status = 'alpha'),
  'worker 1 should have alpha attendance row'
);

select pg_temp.assert_true(
  (select alpha_count from public.worker_records where user_id = '${ids.worker1}'::uuid and period_month = '2026-06-01'::date) = 1,
  'worker 1 alpha_count should be incremented'
);

select pg_temp.assert_true(
  exists (select 1 from public.audit_logs where target_user_id = '${ids.worker1}'::uuid and domain = 'cron' and action = 'cron.auto_alpha'),
  'audit log should record auto_alpha event'
);

-- TEST ALPHA_DONE_RESET (Entering next day shift cycle. Time is 2026-06-30 06:05:00 WIB)
select public.execute_cron_state_machine('2026-06-30 06:05:00+07'::timestamptz);

select pg_temp.assert_true(
  not (select alpha_done from public.worker_status where user_id = '${ids.worker1}'::uuid),
  'worker 1 alpha_done should be reset to false in new shift cycle'
);

select pg_temp.assert_true(
  exists (select 1 from public.audit_logs where target_user_id = '${ids.worker1}'::uuid and domain = 'cron' and action = 'cron.alpha_done_reset'),
  'audit log should record alpha_done_reset event'
);

-- TEST AUTO_OFF_SHIFT
-- Set worker 1 status to 'on', active date is 2026-06-30
update public.worker_status
set current_status = 'on', shift_active_date = '2026-06-30'::date
where user_id = '${ids.worker1}'::uuid;

-- Calling cron at 2026-06-30 14:05:00 WIB (after shift end)
select public.execute_cron_state_machine('2026-06-30 14:05:00+07'::timestamptz);

select pg_temp.assert_true(
  (select current_status from public.worker_status where user_id = '${ids.worker1}'::uuid) = 'off',
  'worker 1 status should be auto-off after shift ends'
);

-- TEST BREAK_LATE
-- Set worker 1 status to 'break', break started 61 mins ago
update public.worker_status
set current_status = 'break', break_timer_running = true, break_started_at = '2026-06-30 12:00:00+07'::timestamptz, break_accumulated_secs = 0, break_late_recorded = false
where user_id = '${ids.worker1}'::uuid;

select public.execute_cron_state_machine('2026-06-30 13:01:00+07'::timestamptz);

select pg_temp.assert_true(
  (select break_late_recorded from public.worker_status where user_id = '${ids.worker1}'::uuid),
  'worker 1 break_late_recorded should be true'
);

select pg_temp.assert_true(
  (select break_late_seconds from public.worker_records where user_id = '${ids.worker1}'::uuid and period_month = '2026-06-01'::date) = 60,
  'worker 1 break_late_seconds should be 60'
);

-- TEST SAKIT_TO_PENDING
-- Set worker 1 status to 'sakit' started 73 hours ago
update public.worker_status
set current_status = 'sakit', sakit_started_at = '2026-06-30 12:00:00+07'::timestamptz - interval '73 hours'
where user_id = '${ids.worker1}'::uuid;

select public.execute_cron_state_machine('2026-06-30 13:00:00+07'::timestamptz);

select pg_temp.assert_true(
  (select current_status from public.worker_status where user_id = '${ids.worker1}'::uuid) = 'pending',
  'worker 1 status should transition to pending after 72h sakit'
);

rollback;
`;
}
