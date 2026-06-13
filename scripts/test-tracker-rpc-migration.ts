import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const expectedPublicSignature =
  "public.apply_tracker_action(p_target_user_id uuid, p_action text, p_expected_version bigint)";
const expectedPrivateSignature =
  "app_private.apply_tracker_action_impl(p_actor_user_id uuid, p_target_user_id uuid, p_action text, p_expected_version bigint, p_now timestamptz)";

const migrationSql = readR2CBMigration();
const normalizedSql = normalizeSql(migrationSql);
const publicFunctionSql = extractFunctionSql("public.apply_tracker_action");
const privateFunctionSql = extractFunctionSql("app_private.apply_tracker_action_impl");
const r2cDMigrationSql = readR2CDMigration();
const normalizedR2CDMigrationSql = normalizeSql(r2cDMigrationSql);
const r2cDPrivateFunctionSql = extractFunctionSqlFrom(
  r2cDMigrationSql,
  "app_private.apply_tracker_action_impl",
);
const r3T1MigrationSql = readR3T1Migration();
const normalizedR3T1MigrationSql = normalizeSql(r3T1MigrationSql);
const r3T1PublicFunctionSql = extractFunctionSqlFrom(
  r3T1MigrationSql,
  "public.apply_tracker_absence_close",
);
const r3T1PrivateFunctionSql = extractFunctionSqlFrom(
  r3T1MigrationSql,
  "app_private.apply_tracker_absence_close_impl",
);
const r3T2MigrationSql = readR3T2Migration();
const normalizedR3T2MigrationSql = normalizeSql(r3T2MigrationSql);
const r3T2PublicFunctionSql = extractFunctionSqlFrom(
  r3T2MigrationSql,
  "public.materialize_tracker_absence_days",
);
const r3T2PrivateFunctionSql = extractFunctionSqlFrom(
  r3T2MigrationSql,
  "app_private.materialize_tracker_absence_days_impl",
);

assertFunctionShape(publicFunctionSql, expectedPublicSignature);
assertFunctionShape(privateFunctionSql, expectedPrivateSignature);

assertSqlIncludes(
  "revoke execute on function public.apply_tracker_action(uuid, text, bigint) from public",
);
assertSqlIncludes(
  "revoke execute on function public.apply_tracker_action(uuid, text, bigint) from anon",
);
assertSqlIncludes(
  "grant execute on function public.apply_tracker_action(uuid, text, bigint) to authenticated",
);

assertSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon",
);
assertSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated",
);

assert.equal(
  /\bgrant\s+update\s+on\s+public\.worker_status\s+to\s+authenticated\b/i.test(
    migrationSql,
  ),
  false,
  "R2C-B must not grant direct worker_status UPDATE to authenticated.",
);

assertNoForbiddenPattern(
  /\bcurrent_status\s*=\s*'late'\b|\bstatus\s*=\s*'late'\b/i,
  "R2C-B must not write stored LATE values.",
);
assertNoForbiddenPattern(
  /\bsource\s*=\s*'tracker'[\s\S]{0,220}\bstatus\s*=\s*'alpha'\b|\bstatus\s*=\s*'alpha'[\s\S]{0,220}\bsource\s*=\s*'tracker'\b/i,
  "R2C-B must not write tracker-sourced ALPHA.",
);
assertNoForbiddenPattern(/\/api\/tracker/i, "R2C-B-02 must not add /api/tracker.");
assertNoForbiddenPattern(/['"]use server['"]/i, "R2C-B-02 must not add Server Actions.");
assertNoForbiddenPattern(/\bservice_role\b/i, "R2C-B-02 must not use service role strings.");
assertNoForbiddenPattern(
  /\b(formAction|useActionState|handleStart|handleFinish|handleCuti|handleSakit|handlePending|handleLembur)\b/i,
  "R2C-B-02 must not activate tracker UI controls.",
);
assertNoForbiddenPattern(
  /\b(pg_cron|cron\.schedule|reset_tracker|cancel_tracker|p_action\s*=\s*'LEMBUR'|'LEMBUR'\s*,\s*'lembur')\b/i,
  "R2C-B-02 baseline excludes cron/reset/cancel/lembur automation.",
);

assert.equal(
  /\bbreak_late_seconds\b/i.test(migrationSql),
  false,
  "R2C-B-02E must not write break_late_seconds.",
);
assertNoForbiddenPattern(
  /\b(password|passphrase|secret|service_role|credential|api_key|token)\b/i,
  "R2C-B-02F tracker audit payload must avoid sanitizer-restricted words.",
);
assertNoForbiddenPattern(
  /\bexception\s+when\b/i,
  "R2C-B-02F must not catch or suppress audit failures.",
);
assert.match(
  privateFunctionSql,
  /\bapp_private\.write_audit_log\s*\(/i,
  "R2C-B-02F must write audit logs from the private implementation.",
);
assert.equal(
  /\bwrite_audit_log\s*\(/i.test(publicFunctionSql),
  false,
  "R2C-B-02F must not write audit logs from the public wrapper.",
);
assertOrderedFragments(
  privateFunctionSql,
  "if v_to_version is distinct from v_from_version + 1",
  "v_audit_id := app_private.write_audit_log(",
  "return pg_catalog.jsonb_build_object(",
);
assertSqlIncludes("'tracker'");
assertSqlIncludes("'worker_status'");
assertSqlIncludes("'tracker.break_start'");
assertSqlIncludes("'tracker.break_end'");
assertSqlIncludes("'tracker.finish'");
assertSqlIncludes("'action', v_audit_action");
assertSqlIncludes("'target_user_id', p_target_user_id");
assertSqlIncludes("'gid', v_gid");
assertSqlIncludes("'attendance_date', v_attendance_date");
assertSqlIncludes("'period_month', v_period_month");
assertSqlIncludes("'from_status', v_from_status");
assertSqlIncludes("'to_status', v_to_status");
assertSqlIncludes("'display_status_before', v_display_status_before");
assertSqlIncludes("'from_version', v_from_version");
assertSqlIncludes("'to_version', v_to_version");
assertSqlIncludes("'attendance_status', v_attendance_status");
assertSqlIncludes("'attendance_reused', case when v_attendance_reused then true end");
assertSqlIncludes("'record_deltas', v_record_deltas");
assertSqlIncludes("'cuti_stock_delta', v_cuti_stock_delta");
assertSqlIncludes("'cuti_stock_after', v_cuti_stock_after");
assertSqlIncludes("'cuti_stock_snapshot_after', v_record_cuti_stock_snapshot");
assertSqlIncludes("v_record_deltas := pg_catalog.jsonb_build_object('work_late_seconds', v_record_work_late_seconds)");
assertSqlIncludes("v_record_deltas := pg_catalog.jsonb_build_object('pending_days', v_record_pending_days)");
assertSqlIncludes("v_record_deltas := pg_catalog.jsonb_build_object('sakit_days', v_record_sakit_days)");
assertSqlIncludes("'audit_id', v_audit_id");
assertNoForbiddenPattern(
  /\bcuti_stock_snapshot\b\s*,\s*v_record_deltas\b/i,
  "CUTI stock snapshots must not be reported as record_deltas.",
);

assertSqlIncludes("auth.uid()");
assertSqlIncludes("tracker.unauthenticated");
assertSqlIncludes("tracker.unauthorized");
assertSqlIncludes("tracker.invalid_action");
assertSqlIncludes("tracker.invalid_target");
assertSqlIncludes("tracker.version_conflict");
assertSqlIncludes("tracker.invalid_transition");
assertSqlIncludes("tracker.alpha_rejected");
assertSqlIncludes("tracker.attendance_conflict");
assertSqlIncludes("tracker.cuti_stock_exhausted");
assertSqlIncludes("using errcode = '23514'");
assertSqlIncludes("u.is_deleted = false");
assertSqlIncludes("u.tier in ('owner', 'admin')");
assertSqlIncludes("'START'");
assertSqlIncludes("'ISTIRAHAT'");
assertSqlIncludes("'LANJUT'");
assertSqlIncludes("'SELESAI'");
assertSqlIncludes("'CUTI'");
assertSqlIncludes("'IZIN'");
assertSqlIncludes("'SAKIT'");
assertSqlIncludes("p_expected_version is null or p_expected_version < 0");
assertSqlIncludes("app_private.apply_tracker_action_impl");
assertSqlIncludes("from public.worker_status as ws");
assertSqlIncludes("for update");
assertSqlIncludes("from public.worker_profiles as wp");
assertSqlIncludes("tu.is_deleted = false");
assertSqlIncludes("v_from_version <> p_expected_version");
assertSqlIncludes("version = v_from_version + 1");
assertSqlIncludes("v_to_version is distinct from v_from_version + 1");
assertSqlIncludes("v_wib_timestamp := p_now at time zone 'Asia/Jakarta'");
assertSqlIncludes("v_attendance_date := v_wib_date - 1");
assertSqlIncludes("v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date");
assertSqlIncludes("pg_catalog.make_timestamptz");
assertSqlIncludes("pg_catalog.make_interval(mins => 10)");
assertSqlIncludes("v_display_status_before := 'LATE'");
assertSqlIncludes("v_display_status_before = 'ALPHA'");
assertSqlIncludes("v_work_late_seconds_delta");
assertSqlIncludes("if v_action = 'START' then");
assertSqlIncludes("elsif v_action = 'ISTIRAHAT' then");
assertSqlIncludes("elsif v_action = 'LANJUT' then");
assertSqlIncludes("elsif v_action = 'SELESAI' then");
assertSqlIncludes("current_status = 'on'");
assertSqlIncludes("current_status = 'break'");
assertSqlIncludes("current_status = 'off'");
assertSqlIncludes("shift_active_date = v_attendance_date");
assertSqlIncludes("shift_active_started_at = p_now");
assertSqlIncludes("break_started_at = p_now");
assertSqlIncludes("break_timer_running = true");
assertSqlIncludes("break_accumulated_secs = v_break_accumulated_secs");
assertSqlIncludes("break_started_at = null");
assertSqlIncludes("break_timer_running = false");
assertSqlIncludes("shift_active_date = null");
assertSqlIncludes("from public.worker_attendance as wa");
assertSqlIncludes("v_existing_attendance_status text;");
assertSqlIncludes("v_attendance_reused boolean := false;");
assertSqlIncludes("select wa.status into v_existing_attendance_status");
assertSqlIncludes("if v_existing_attendance_status is not null then");
assertSqlIncludes("if v_action = 'START' and v_existing_attendance_status = 'hadir' then");
assertSqlIncludes("v_attendance_reused := true;");
assertSqlIncludes("v_work_late_seconds_delta := 0;");
assertSqlIncludes("else raise exception 'tracker.attendance_conflict'");
assertSqlIncludes("insert into public.worker_attendance");
assertSqlIncludes("on conflict on constraint worker_attendance_user_date_key do nothing");
assertSqlIncludes("status, source, source_action, created_at, updated_at");
assertSqlIncludes("if not v_attendance_reused then");
assertSqlIncludes("if v_display_status_before = 'LATE' and not v_attendance_reused then");
assertSqlIncludes("'hadir'");
assertSqlIncludes("'cuti'");
assertSqlIncludes("'pending'");
assertSqlIncludes("'sakit'");
assertSqlIncludes("'tracker'");
assertSqlIncludes("'tracker.start'");
assertSqlIncludes("'tracker.start_late'");
assertSqlIncludes("'tracker.cuti'");
assertSqlIncludes("'tracker.izin'");
assertSqlIncludes("'tracker.sakit'");
assertSqlIncludes("insert into public.worker_records");
assertSqlIncludes("on conflict (user_id, period_month) do update");
assertSqlIncludes("work_late_seconds = public.worker_records.work_late_seconds + excluded.work_late_seconds");
assertSqlIncludes("pending_days = public.worker_records.pending_days + excluded.pending_days");
assertSqlIncludes("sakit_days = public.worker_records.sakit_days + excluded.sakit_days");
assertSqlIncludes("cuti_stock_snapshot = coalesce(excluded.cuti_stock_snapshot, public.worker_records.cuti_stock_snapshot)");
assertSqlIncludes("last_source = excluded.last_source");
assertSqlIncludes("last_source_action = excluded.last_source_action");
assertSqlIncludes("from public.worker_profiles as cp");
assertSqlIncludes("for update");
assertSqlIncludes("v_cuti_stock_before <= 0");
assertSqlIncludes("cuti_stock = cuti_stock - 1");
assertSqlIncludes("returning wp.cuti_stock into v_cuti_stock_after");
assertSqlIncludes("v_record_cuti_stock_snapshot := v_cuti_stock_after");
assertSqlIncludes("current_status = 'cuti'");
assertSqlIncludes("current_status = 'pending'");
assertSqlIncludes("current_status = 'sakit'");
assertSqlIncludes("cuti_set_date = v_attendance_date");
assertSqlIncludes("pending_started_at = p_now");
assertSqlIncludes("sakit_started_at = p_now");
assertSqlIncludes("'attendance_reused', v_attendance_reused");
assert.equal(
  /\b(current_status|status)\s*=\s*'izin'\b/i.test(migrationSql),
  false,
  "IZIN must map to pending and must not introduce an izin DB status.",
);
assertNoForbiddenPattern(
  /\bv_action\s*(?:=|in\s*\()[^;]*'PENDING'|\bp_action\s*(?:=|in\s*\()[^;]*'PENDING'/i,
  "R2C-B-04B must not introduce a PENDING tracker action enum.",
);
assertNoForbiddenPattern(
  /\b(PAUSE|RESUME)\b/i,
  "R2C-B-04B must not introduce pause/resume tracker actions.",
);

assertFunctionShape(r2cDPrivateFunctionSql, expectedPrivateSignature);
assertR2CDSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from public",
);
assertR2CDSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from anon",
);
assertR2CDSqlIncludes(
  "revoke execute on function app_private.apply_tracker_action_impl(uuid, uuid, text, bigint, timestamptz) from authenticated",
);
assertR2CDSqlIncludes("v_break_accumulated_secs_before integer;");
assertR2CDSqlIncludes("v_record_break_late_seconds integer := 0;");
assertR2CDSqlIncludes("ws.break_late_recorded");
assertR2CDSqlIncludes("break_late_recorded = false");
assertR2CDSqlIncludes("v_break_accumulated_secs_before := v_break_accumulated_secs;");
assertR2CDSqlIncludes(
  "v_record_break_late_seconds := greatest(v_break_accumulated_secs - 3600, 0) - greatest(v_break_accumulated_secs_before - 3600, 0);",
);
assert.equal(
  /\bpg_catalog\.greatest\s*\(/i.test(r2cDMigrationSql),
  false,
  "R2C-D must use PostgreSQL GREATEST syntax without schema qualification.",
);
assertR2CDSqlIncludes("if v_record_break_late_seconds > 0 and not v_break_late_recorded then");
assertR2CDSqlIncludes("v_break_late_recorded := true;");
assertR2CDSqlIncludes("break_late_seconds");
assertR2CDSqlIncludes(
  "break_late_seconds = public.worker_records.break_late_seconds + excluded.break_late_seconds",
);
assertR2CDSqlIncludes(
  "v_record_deltas := pg_catalog.jsonb_build_object('break_late_seconds', v_record_break_late_seconds);",
);
assertR2CDSqlIncludes("break_late_recorded = v_break_late_recorded");
assert.equal(
  /\b(create|alter|drop)\s+table\b/i.test(r2cDMigrationSql),
  false,
  "R2C-D must not change table schemas.",
);
assert.equal(
  /\bgrant\s+update\s+on\s+public\.worker_status\s+to\s+authenticated\b/i.test(
    r2cDMigrationSql,
  ),
  false,
  "R2C-D must not grant direct worker_status UPDATE to authenticated.",
);
assert.equal(
  /\bservice_role\b/i.test(r2cDMigrationSql),
  false,
  "R2C-D must not use service role strings.",
);
assert.equal(
  /\b(PAUSE|RESUME)\b/i.test(r2cDMigrationSql),
  false,
  "R2C-D must not add pause/resume tracker actions.",
);
assert.equal(
  /\bcreate\s+or\s+replace\s+function\s+public\.apply_tracker_action\b/i.test(
    r2cDMigrationSql,
  ),
  false,
  "R2C-D must not replace the stable public tracker RPC.",
);

assertFunctionShape(
  r3T1PublicFunctionSql,
  "public.apply_tracker_absence_close(p_target_user_id uuid, p_expected_version bigint, p_attendance_id uuid)",
);
assertFunctionShape(
  r3T1PrivateFunctionSql,
  "app_private.apply_tracker_absence_close_impl(p_actor_user_id uuid, p_target_user_id uuid, p_expected_version bigint, p_attendance_id uuid, p_now timestamptz)",
);
assertR3T1SqlIncludes(
  "revoke execute on function public.apply_tracker_absence_close(uuid, bigint, uuid) from public",
);
assertR3T1SqlIncludes(
  "revoke execute on function public.apply_tracker_absence_close(uuid, bigint, uuid) from anon",
);
assertR3T1SqlIncludes(
  "grant execute on function public.apply_tracker_absence_close(uuid, bigint, uuid) to authenticated",
);
assertR3T1SqlIncludes(
  "revoke execute on function app_private.apply_tracker_absence_close_impl(uuid, uuid, bigint, uuid, timestamptz) from public",
);
assertR3T1SqlIncludes(
  "revoke execute on function app_private.apply_tracker_absence_close_impl(uuid, uuid, bigint, uuid, timestamptz) from authenticated",
);
assertR3T1SqlIncludes("auth.uid()");
assertR3T1SqlIncludes("u.tier in ('owner', 'admin')");
assertR3T1SqlIncludes("tracker.unauthenticated");
assertR3T1SqlIncludes("tracker.unauthorized");
assertR3T1SqlIncludes("tracker.absence_close_not_expired");
assertR3T1SqlIncludes("tracker.version_conflict");
assertR3T1SqlIncludes("tracker.invalid_transition");
assertR3T1SqlIncludes("tracker.attendance_missing");
assertR3T1SqlIncludes("from public.worker_status as ws");
assertR3T1SqlIncludes("for update");
assertR3T1SqlIncludes("v_from_status not in ('cuti', 'sakit', 'pending')");
assertR3T1SqlIncludes("v_expected_source_action");
assertR3T1SqlIncludes("v_status_marker_date");
assertR3T1SqlIncludes("when 'pending' then 'tracker.izin'");
assertR3T1SqlIncludes("if p_attendance_id is not null then");
assertR3T1SqlIncludes("wa.is_canceled");
assertR3T1SqlIncludes("v_attendance_source <> 'tracker'");
assertR3T1SqlIncludes("v_attendance_source_action <> v_expected_source_action");
assertR3T1SqlIncludes("when 'cuti' then v_cuti_set_date");
assertR3T1SqlIncludes("when 'sakit' then (v_sakit_started_at at time zone 'Asia/Jakarta')::date");
assertR3T1SqlIncludes("when 'pending' then (v_pending_started_at at time zone 'Asia/Jakarta')::date");
assertR3T1SqlIncludes("v_attendance_date := coalesce(v_attendance_date, v_status_marker_date)");
assertR3T1SqlIncludes("if v_is_flexible then");
assertR3T1SqlIncludes("(p_now at time zone 'Asia/Jakarta')::date = v_attendance_date");
assertR3T1SqlIncludes("if p_now < v_shift_ends_at then");
assertR3T1SqlIncludes("current_status = 'off'");
assertR3T1SqlIncludes("version = v_from_version + 1");
assertR3T1SqlIncludes("shift_active_date = null");
assertR3T1SqlIncludes("break_started_at = null");
assertR3T1SqlIncludes("sakit_started_at = null");
assertR3T1SqlIncludes("pending_started_at = null");
assertR3T1SqlIncludes("cuti_set_date = null");
assertR3T1SqlIncludes("v_audit_id := app_private.write_audit_log(");
assertR3T1SqlIncludes("'tracker.close_expired_absence'");
assertR3T1SqlIncludes("'attendance_id', p_attendance_id");
assertR3T1SqlIncludes("'from_status', v_from_status");
assertR3T1SqlIncludes("'to_status', 'off'");
assertR3T1SqlIncludes("'audit_id', v_audit_id");
assert.equal(
  /\b(update|insert\s+into|delete\s+from)\s+public\.worker_attendance\b/i.test(r3T1MigrationSql),
  false,
  "R3-T1 close must not mutate worker_attendance.",
);
assert.equal(
  /\b(update|insert\s+into|delete\s+from)\s+public\.worker_records\b/i.test(r3T1MigrationSql),
  false,
  "R3-T1 close must not mutate worker_records.",
);
assert.equal(
  /\bupdate\s+public\.worker_profiles\b/i.test(r3T1MigrationSql),
  false,
  "R3-T1 close must not mutate cuti stock or worker_profiles.",
);
assert.equal(
  /\bis_canceled\s*=\s*true\b/i.test(r3T1MigrationSql),
  false,
  "R3-T1 close must not cancel attendance rows.",
);
assert.equal(
  /\bapply_tracker_correction\b/i.test(r3T1PrivateFunctionSql),
  false,
  "R3-T1 close must not call tracker correction RPCs.",
);

assertFunctionShape(
  r3T2PublicFunctionSql,
  "public.materialize_tracker_absence_days(p_target_user_id uuid, p_expected_version bigint)",
);
assertFunctionShape(
  r3T2PrivateFunctionSql,
  "app_private.materialize_tracker_absence_days_impl(p_actor_user_id uuid, p_target_user_id uuid, p_expected_version bigint, p_now timestamptz)",
);
assertR3T2SqlIncludes(
  "revoke execute on function public.materialize_tracker_absence_days(uuid, bigint) from public",
);
assertR3T2SqlIncludes(
  "revoke execute on function public.materialize_tracker_absence_days(uuid, bigint) from anon",
);
assertR3T2SqlIncludes(
  "grant execute on function public.materialize_tracker_absence_days(uuid, bigint) to authenticated",
);
assertR3T2SqlIncludes(
  "revoke execute on function app_private.materialize_tracker_absence_days_impl(uuid, uuid, bigint, timestamptz) from public",
);
assertR3T2SqlIncludes(
  "revoke execute on function app_private.materialize_tracker_absence_days_impl(uuid, uuid, bigint, timestamptz) from authenticated",
);
assertR3T2SqlIncludes("auth.uid()");
assertR3T2SqlIncludes("u.tier in ('owner', 'admin')");
assertR3T2SqlIncludes("tracker.unauthenticated");
assertR3T2SqlIncludes("tracker.unauthorized");
assertR3T2SqlIncludes("tracker.version_conflict");
assertR3T2SqlIncludes("tracker.invalid_transition");
assertR3T2SqlIncludes("tracker.materialization_conflict");
assertR3T2SqlIncludes("tracker.cuti_stock_exhausted");
assertR3T2SqlIncludes("from public.worker_status as ws");
assertR3T2SqlIncludes("for update");
assertR3T2SqlIncludes("perform 1");
assertR3T2SqlIncludes("from public.worker_attendance as wa");
assertR3T2SqlIncludes("for update");
assertR3T2SqlIncludes("v_from_status not in ('cuti', 'sakit', 'pending')");
assertR3T2SqlIncludes("when 'cuti' then v_cuti_set_date");
assertR3T2SqlIncludes("when 'sakit' then (v_sakit_started_at at time zone 'Asia/Jakarta')::date");
assertR3T2SqlIncludes("when 'pending' then (v_pending_started_at at time zone 'Asia/Jakarta')::date");
assertR3T2SqlIncludes("v_expected_source_action");
assertR3T2SqlIncludes("when 'pending' then 'tracker.izin'");
assertR3T2SqlIncludes("generate_series(v_marker_date, v_current_attendance_date, interval '1 day')");
assertR3T2SqlIncludes("on conflict on constraint worker_attendance_user_date_key do nothing");
assertR3T2SqlIncludes("status, source, source_action, created_at, updated_at");
assertR3T2SqlIncludes("insert into public.worker_records");
assertR3T2SqlIncludes("on conflict (user_id, period_month) do update");
assertR3T2SqlIncludes("sakit_days = public.worker_records.sakit_days + excluded.sakit_days");
assertR3T2SqlIncludes("pending_days = public.worker_records.pending_days + excluded.pending_days");
assertR3T2SqlIncludes("cuti_stock_snapshot = coalesce(excluded.cuti_stock_snapshot, public.worker_records.cuti_stock_snapshot)");
assertR3T2SqlIncludes("update public.worker_profiles as wp");
assertR3T2SqlIncludes("cuti_stock = cuti_stock - v_inserted_count");
assertR3T2SqlIncludes("v_audit_id := app_private.write_audit_log(");
assertR3T2SqlIncludes("'tracker.materialize_absence_days'");
assertR3T2SqlIncludes("'inserted_count', v_inserted_count");
assertR3T2SqlIncludes("'inserted_dates', v_inserted_dates");
assertR3T2SqlIncludes("'skipped_existing_dates', v_skipped_existing_dates");
assertR3T2SqlIncludes("'skipped_canceled_dates', v_skipped_canceled_dates");
assertR3T2SqlIncludes("'cuti_stock_delta', v_cuti_stock_delta");
assertR3T2SqlIncludes("'audit_id', v_audit_id");
assert.equal(
  /\bgrant\s+update\s+on\s+public\.worker_(attendance|records|profiles|status)\s+to\s+authenticated\b/i.test(
    r3T2MigrationSql,
  ),
  false,
  "R3-T2 must not grant direct table update privileges to authenticated.",
);
assert.equal(
  /\b(current_status|status)\s*=\s*'late'\b/i.test(r3T2MigrationSql),
  false,
  "R3-T2 must not store LATE.",
);
assert.equal(
  /\bapply_tracker_correction\b/i.test(r3T2PrivateFunctionSql),
  false,
  "R3-T2 materialization must not call tracker correction RPCs.",
);
assert.equal(
  /\bapply_tracker_absence_close\b/i.test(r3T2PrivateFunctionSql),
  false,
  "R3-T2 materialization must not call expired close RPCs.",
);

console.log("Tracker RPC migration static tests passed.");

function readR2CBMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_2c_b_tracker_action_rpc.sql"),
  );

  assert.ok(
    migrationFile,
    "R2C-B tracker RPC migration not found yet. This is expected before R2C-B-02C.",
  );

  return readFileSync(join(migrationsDir, migrationFile), "utf8");
}

function readR2CDMigration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFile = readdirSync(migrationsDir).find((entry) =>
    entry.endsWith("_release_2c_d_tracker_break_late.sql"),
  );

  assert.ok(migrationFile, "R2C-D tracker BREAK_LATE migration not found.");

  return readFileSync(join(migrationsDir, migrationFile), "utf8");
}

function readR3T1Migration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith("_r3_t1_expired_absence_close_action.sql"))
    .sort();

  assert.ok(
    migrationFiles.length > 0,
    "R3-T1 expired absence close migration not found.",
  );

  return migrationFiles
    .map((migrationFile) => readFileSync(join(migrationsDir, migrationFile), "utf8"))
    .join("\n\n");
}

function readR3T2Migration() {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith("_r3_t2_absence_attendance_materialization.sql"))
    .sort();

  assert.ok(
    migrationFiles.length > 0,
    "R3-T2 absence attendance materialization migration not found.",
  );

  return migrationFiles
    .map((migrationFile) => readFileSync(join(migrationsDir, migrationFile), "utf8"))
    .join("\n\n");
}

function assertFunctionShape(functionSql: string, expectedSignature: string) {
  const normalizedFunction = normalizeSql(functionSql);

  assert.ok(
    normalizedFunction.includes(normalizeSql(`create or replace function ${expectedSignature}`)),
    `Missing exact function signature: ${expectedSignature}`,
  );
  assert.ok(
    normalizedFunction.includes("returns jsonb"),
    `${expectedSignature} must return jsonb.`,
  );
  assert.ok(
    normalizedFunction.includes("language plpgsql"),
    `${expectedSignature} must use language plpgsql.`,
  );
  assert.ok(
    normalizedFunction.includes("security definer"),
    `${expectedSignature} must be SECURITY DEFINER.`,
  );
  assert.ok(
    normalizedFunction.includes("set search_path = ''"),
    `${expectedSignature} must set an empty search_path.`,
  );
}

function extractFunctionSql(functionName: string) {
  return extractFunctionSqlFrom(migrationSql, functionName);
}

function extractFunctionSqlFrom(sql: string, functionName: string) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${escapeRegExp(functionName)}\\s*\\([\\s\\S]*?\\n\\$\\$;`,
    "gi",
  );
  const matches = sql.match(pattern);

  assert.ok(matches?.length, `Missing function body for ${functionName}.`);
  return matches[matches.length - 1];
}

function assertSqlIncludes(fragment: string) {
  assert.ok(normalizedSql.includes(normalizeSql(fragment)), `Missing SQL fragment: ${fragment}`);
}

function assertR2CDSqlIncludes(fragment: string) {
  assert.ok(
    normalizedR2CDMigrationSql.includes(normalizeSql(fragment)),
    `Missing R2C-D SQL fragment: ${fragment}`,
  );
}

function assertR3T1SqlIncludes(fragment: string) {
  assert.ok(
    normalizedR3T1MigrationSql.includes(normalizeSql(fragment)),
    `Missing R3-T1 SQL fragment: ${fragment}`,
  );
}

function assertR3T2SqlIncludes(fragment: string) {
  assert.ok(
    normalizedR3T2MigrationSql.includes(normalizeSql(fragment)),
    `Missing R3-T2 SQL fragment: ${fragment}`,
  );
}

function assertNoForbiddenPattern(pattern: RegExp, message: string) {
  assert.equal(pattern.test(migrationSql), false, message);
}

function assertOrderedFragments(functionSql: string, ...fragments: string[]) {
  const normalizedFunction = normalizeSql(functionSql).toLowerCase();
  let cursor = -1;

  for (const fragment of fragments) {
    const next = normalizedFunction.indexOf(normalizeSql(fragment).toLowerCase(), cursor + 1);

    assert.notEqual(next, -1, `Missing ordered SQL fragment: ${fragment}`);
    assert.ok(
      next > cursor,
      `SQL fragment is out of order: ${fragment}`,
    );

    cursor = next;
  }
}

function normalizeSql(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
