-- Migration: Add cron_apply_scheduled_attendance RPC to automate future attendance
CREATE OR REPLACE FUNCTION public.cron_apply_scheduled_attendance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_wib date;
  v_applied_count integer := 0;
  rec record;
  v_existing_attendance record;
BEGIN
  -- 1. Determine current date in WIB (Asia/Jakarta)
  v_today_wib := (now() AT TIME ZONE 'Asia/Jakarta')::date;

  -- 2. Loop through all active scheduled_attendance records where target_date <= v_today_wib
  FOR rec IN
    SELECT id, user_id, target_date, status, notes
    FROM public.scheduled_attendance
    WHERE target_date <= v_today_wib
      AND applied_at IS NULL
      AND cancelled_at IS NULL
    ORDER BY target_date ASC, created_at ASC
  LOOP
    -- 3. Double-apply Guard: check if worker_attendance row already exists for user_id and target_date
    SELECT id INTO v_existing_attendance
    FROM public.worker_attendance
    WHERE user_id = rec.user_id
      AND attendance_date = rec.target_date
      AND is_canceled = false;

    IF FOUND THEN
      -- Worker already has an active attendance entry (e.g. checked in manual first).
      -- Just mark the scheduled_attendance as applied to prevent overwriting/double-applying.
      UPDATE public.scheduled_attendance
      SET applied_at = now(),
          updated_at = now()
      WHERE id = rec.id;
    ELSE
      -- Insert into worker_attendance
      INSERT INTO public.worker_attendance (
        user_id,
        attendance_date,
        status,
        source,
        source_action,
        created_at,
        updated_at
      ) VALUES (
        rec.user_id,
        rec.target_date,
        rec.status,
        'cron',
        'apply_scheduled',
        now(),
        now()
      )
      ON CONFLICT (user_id, attendance_date) DO UPDATE
      SET status = EXCLUDED.status,
          source = EXCLUDED.source,
          source_action = EXCLUDED.source_action,
          updated_at = now();

      -- Update worker_status for the user to reflect current scheduled status
      UPDATE public.worker_status
      SET current_status = rec.status,
          updated_at = now()
      WHERE user_id = rec.user_id;

      -- Recalculate monthly summary if app_private function exists
      BEGIN
        PERFORM app_private.recalculate_worker_records(rec.user_id, rec.target_date);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      -- Audit Log
      INSERT INTO public.audit_logs (
        actor_user_id,
        target_user_id,
        domain,
        action,
        payload_json,
        created_at
      ) VALUES (
        NULL,
        rec.user_id,
        'absensi',
        'cron.apply_scheduled',
        jsonb_build_object(
          'schedule_id', rec.id,
          'status', rec.status,
          'target_date', rec.target_date,
          'notes', rec.notes
        ),
        now()
      );

      -- Mark schedule as applied
      UPDATE public.scheduled_attendance
      SET applied_at = now(),
          updated_at = now()
      WHERE id = rec.id;

      v_applied_count := v_applied_count + 1;
    END IF;
  END LOOP;

  RETURN v_applied_count;
END;
$$;
