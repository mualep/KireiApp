-- R4: Cron State Machine implementation
-- This migration updates app_private.write_audit_log to allow non-authenticated cron execution,
-- and implements the execute_cron_state_machine function and its wrappers.

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
  if v_actor_id is null and lower(v_domain) <> 'cron' then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if v_actor_id is not null then
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

create or replace function app_private.get_shift_alpha_expiry(p_shift text, p_date date)
returns timestamptz
language plpgsql
as $$
declare
  v_expiry_date date;
  v_expiry_hour integer;
begin
  if p_shift in ('A', '1', 'B', 'C', '2') then
    v_expiry_date := p_date + 1;
    v_expiry_hour := 0;
  elsif p_shift in ('D', 'E', '3') then
    v_expiry_date := p_date + 1;
    v_expiry_hour := 12;
  elsif p_shift = 'F' then
    v_expiry_date := p_date;
    v_expiry_hour := 12;
  else
    -- Fallback
    v_expiry_date := p_date + 1;
    v_expiry_hour := 0;
  end if;

  return pg_catalog.make_timestamptz(
    pg_catalog.date_part('year', v_expiry_date::timestamp)::integer,
    pg_catalog.date_part('month', v_expiry_date::timestamp)::integer,
    pg_catalog.date_part('day', v_expiry_date::timestamp)::integer,
    v_expiry_hour,
    0,
    0,
    'Asia/Jakarta'
  );
end;
$$;

create or replace function app_private.execute_cron_state_machine(p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_wib_timestamp timestamptz;
  v_wib_date date;
  v_current_wib_minutes integer;
  
  -- Shift variables
  v_is_flexible boolean;
  v_shift_start_hour integer;
  v_shift_start_min integer;
  v_shift_end_hour integer;
  v_shift_end_min integer;
  
  v_shift_start_minutes integer;
  v_shift_end_minutes integer;
  v_attendance_date date;
  v_shift_end_date date;
  v_shift_starts_at timestamptz;
  v_shift_ends_at timestamptz;
  
  v_period_month date;
  v_expiry_time timestamptz;
  
  v_audit_id uuid;
  v_attendance_id uuid;
  
  v_total_break_secs integer;
  v_record_break_late_seconds integer;
begin
  -- Loop through all workers with show_card = true
  for r in
    select 
      wp.user_id,
      wp.shift,
      wp.is_flexible,
      wp.shift_start_hour,
      wp.shift_start_min,
      wp.shift_end_hour,
      wp.shift_end_min,
      ws.current_status,
      ws.version,
      ws.alpha_done,
      ws.shift_active_date,
      ws.break_started_at,
      ws.break_timer_running,
      ws.break_accumulated_secs,
      ws.break_late_recorded,
      ws.sakit_started_at
    from public.worker_profiles wp
    join public.worker_status ws on wp.user_id = ws.user_id
    where wp.show_card = true
  loop
    -- Calculate derived shift details for this worker
    v_is_flexible := r.is_flexible;
    
    if not v_is_flexible then
      v_shift_start_hour := r.shift_start_hour;
      v_shift_start_min := r.shift_start_min;
      v_shift_end_hour := r.shift_end_hour;
      v_shift_end_min := r.shift_end_min;
      
      -- We must have valid shift times for non-flexible workers
      if v_shift_start_hour is not null 
         and v_shift_start_min is not null 
         and v_shift_end_hour is not null 
         and v_shift_end_min is not null 
      then
        v_wib_timestamp := p_now at time zone 'Asia/Jakarta';
        v_wib_date := v_wib_timestamp::date;
        v_current_wib_minutes := 
          (pg_catalog.date_part('hour', v_wib_timestamp)::integer * 60)
          + pg_catalog.date_part('minute', v_wib_timestamp)::integer;
          
        v_shift_start_minutes := (v_shift_start_hour * 60) + v_shift_start_min;
        v_shift_end_minutes := (v_shift_end_hour * 60) + v_shift_end_min;
        
        if v_shift_start_minutes > v_shift_end_minutes
           and v_current_wib_minutes < v_shift_end_minutes
        then
          v_attendance_date := v_wib_date - 1;
        else
          v_attendance_date := v_wib_date;
        end if;
        
        v_shift_end_date := v_attendance_date;
        if v_shift_end_minutes <= v_shift_start_minutes then
          v_shift_end_date := v_attendance_date + 1;
        end if;
        
        v_shift_starts_at := pg_catalog.make_timestamptz(
          pg_catalog.date_part('year', v_attendance_date::timestamp)::integer,
          pg_catalog.date_part('month', v_attendance_date::timestamp)::integer,
          pg_catalog.date_part('day', v_attendance_date::timestamp)::integer,
          v_shift_start_hour,
          v_shift_start_min,
          0,
          'Asia/Jakarta'
        );
        v_shift_ends_at := pg_catalog.make_timestamptz(
          pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
          pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
          pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
          v_shift_end_hour,
          v_shift_end_min,
          0,
          'Asia/Jakarta'
        );
        v_period_month := pg_catalog.date_trunc('month', v_attendance_date::timestamp)::date;
        
        -- 1. ALPHA_DONE_RESET
        -- jika alpha_done=true, status=off, dan sudah masuk siklus shift baru -> reset alpha_done=false.
        if r.alpha_done = true and r.current_status = 'off' then
          if p_now >= v_shift_starts_at and p_now < v_shift_ends_at then
            update public.worker_status
            set alpha_done = false, version = version + 1, updated_at = p_now
            where user_id = r.user_id;
            
            perform app_private.write_audit_log(
              'cron',
              'cron.alpha_done_reset',
              'worker_status',
              r.user_id::text,
              jsonb_build_object('message', 'Reset alpha_done flag for new shift cycle'),
              r.user_id
            );
          end if;
        end if;
        
        -- 3. AUTO_ALPHA
        -- jika worker masih status=off, alpha_done=false, dan p_now >= v_shift_ends_at -> set alpha_done=true, tulis attendance alpha, dan update records secara idempotent.
        if r.current_status = 'off' and r.alpha_done = false then
          if p_now >= v_shift_ends_at then
            -- Tulis attendance 'alpha' secara idempotent
            v_attendance_id := null;
            insert into public.worker_attendance (
              user_id,
              attendance_date,
              status,
              source,
              source_action,
              created_at,
              updated_at
            )
            values (
              r.user_id,
              v_attendance_date,
              'alpha',
              'cron',
              'cron.auto_alpha',
              p_now,
              p_now
            )
            on conflict on constraint worker_attendance_user_date_key do nothing
            returning id into v_attendance_id;
            
            -- Set alpha_done = true
            update public.worker_status
            set alpha_done = true, version = version + 1, updated_at = p_now
            where user_id = r.user_id;
            
            -- If successfully inserted new attendance row, increment records
            if v_attendance_id is not null then
              insert into public.worker_records (
                user_id,
                period_month,
                alpha_count,
                last_source,
                last_source_action,
                created_at,
                updated_at
              )
              values (
                r.user_id,
                v_period_month,
                1,
                'cron',
                'cron.auto_alpha',
                p_now,
                p_now
              )
              on conflict (user_id, period_month) do update
              set 
                alpha_count = public.worker_records.alpha_count + 1,
                last_source = 'cron',
                last_source_action = 'cron.auto_alpha',
                updated_at = p_now;
            end if;
            
            perform app_private.write_audit_log(
              'cron',
              'cron.auto_alpha',
              'worker_status',
              r.user_id::text,
              jsonb_build_object('attendance_date', v_attendance_date, 'message', 'Worker failed to clock in before shift end. Marked as ALPHA.'),
              r.user_id
            );
          end if;
        end if;
        
        -- 4. AUTO_OFF_SHIFT
        -- jika status=on/break, POST-SHIFT (p_now >= v_shift_ends_at) -> set status=off.
        if r.current_status in ('on', 'break') then
          declare
            v_act_date date := coalesce(r.shift_active_date, v_attendance_date);
            v_act_ends_at timestamptz;
          begin
            v_shift_end_date := v_act_date;
            if v_shift_end_minutes <= v_shift_start_minutes then
              v_shift_end_date := v_act_date + 1;
            end if;
            
            v_act_ends_at := pg_catalog.make_timestamptz(
              pg_catalog.date_part('year', v_shift_end_date::timestamp)::integer,
              pg_catalog.date_part('month', v_shift_end_date::timestamp)::integer,
              pg_catalog.date_part('day', v_shift_end_date::timestamp)::integer,
              v_shift_end_hour,
              v_shift_end_min,
              0,
              'Asia/Jakarta'
            );
            
            if p_now >= v_act_ends_at then
              update public.worker_status
              set
                current_status = 'off',
                version = version + 1,
                shift_active_date = null,
                shift_active_started_at = null,
                shift_active_label = null,
                shift_active_start_hour = null,
                shift_active_start_min = null,
                shift_active_end_hour = null,
                shift_active_end_min = null,
                break_started_at = null,
                break_timer_running = false,
                break_accumulated_secs = 0,
                break_late_recorded = false,
                sakit_started_at = null,
                pending_started_at = null,
                cuti_set_date = null,
                lembur_started_at = null,
                updated_at = p_now
              where user_id = r.user_id;
              
              perform app_private.write_audit_log(
                'cron',
                'cron.auto_off_shift',
                'worker_status',
                r.user_id::text,
                jsonb_build_object('message', 'Shift ended. Automatically clocked off.'),
                r.user_id
              );
            end if;
          end;
        end if;
        
        -- 6. AUTO_ALPHA_EXPIRE
        -- jika alpha_done=true dan expiry terlewati -> set alpha_done=false, status=off.
        if r.alpha_done = true and r.current_status = 'off' then
          declare
            v_exp1 timestamptz := app_private.get_shift_alpha_expiry(r.shift, v_attendance_date);
            v_exp2 timestamptz := app_private.get_shift_alpha_expiry(r.shift, (v_attendance_date - 1)::date);
          begin
            if p_now >= v_exp1 or p_now >= v_exp2 then
              update public.worker_status
              set alpha_done = false, version = version + 1, updated_at = p_now
              where user_id = r.user_id;
              
              perform app_private.write_audit_log(
                'cron',
                'cron.auto_alpha_expire',
                'worker_status',
                r.user_id::text,
                jsonb_build_object('message', 'ALPHA display expired.'),
                r.user_id
              );
            end if;
          end;
        end if;
      end if;
    end if;
    
    -- 5. BREAK_LATE
    -- jika durasi break efektif melewati threshold (3600s) -> catat break_late sekali per break episode.
    if r.current_status = 'break' and r.break_timer_running = true and r.break_started_at is not null and r.break_late_recorded = false then
      v_total_break_secs := r.break_accumulated_secs + pg_catalog.floor(pg_catalog.date_part('epoch', p_now - r.break_started_at))::integer;
      if v_total_break_secs > 3600 then
        v_record_break_late_seconds := v_total_break_secs - 3600;
        
        declare
          v_act_date date := coalesce(r.shift_active_date, (p_now at time zone 'Asia/Jakarta')::date);
          v_act_month date := pg_catalog.date_trunc('month', v_act_date::timestamp)::date;
        begin
          -- Set break_late_recorded = true
          update public.worker_status
          set break_late_recorded = true, version = version + 1, updated_at = p_now
          where user_id = r.user_id;
          
          -- Write/update records
          insert into public.worker_records (
            user_id,
            period_month,
            break_late_seconds,
            last_source,
            last_source_action,
            created_at,
            updated_at
          )
          values (
            r.user_id,
            v_act_month,
            v_record_break_late_seconds,
            'cron',
            'cron.break_late',
            p_now,
            p_now
          )
          on conflict (user_id, period_month) do update
          set
            break_late_seconds = public.worker_records.break_late_seconds + excluded.break_late_seconds,
            last_source = 'cron',
            last_source_action = 'cron.break_late',
            updated_at = p_now;
            
          perform app_private.write_audit_log(
            'cron',
            'cron.break_late',
            'worker_status',
            r.user_id::text,
            jsonb_build_object('break_late_seconds', v_record_break_late_seconds, 'message', 'Worker exceeded break duration limit. Recorded break late.'),
            r.user_id
          );
        end;
      end if;
    end if;
    
    -- 7. SAKIT_TO_PENDING
    -- jika status=sakit dan 72 jam terlewati -> set status=pending.
    if r.current_status = 'sakit' and r.sakit_started_at is not null then
      if p_now >= r.sakit_started_at + interval '72 hours' then
        update public.worker_status
        set
          current_status = 'pending',
          pending_started_at = p_now,
          sakit_started_at = null,
          version = version + 1,
          updated_at = p_now
        where user_id = r.user_id;
        
        perform app_private.write_audit_log(
          'cron',
          'cron.sakit_to_pending',
          'worker_status',
          r.user_id::text,
          jsonb_build_object('message', 'Sick leave exceeded 72 hours. Status transitioned to PENDING.'),
          r.user_id
        );
      end if;
    end if;
    
  end loop;
end;
$$;

create or replace function public.execute_cron_state_machine(p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.execute_cron_state_machine(p_now);
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.execute_cron_state_machine(timestamptz) from public;
revoke execute on function public.execute_cron_state_machine(timestamptz) from anon;
grant execute on function public.execute_cron_state_machine(timestamptz) to authenticated;
