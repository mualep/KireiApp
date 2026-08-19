-- Migration: Fix Foreign Key Constraints for Cascading User Deletion
-- Ensures hard-deleting a worker via Supabase Auth Admin API cascades operational records
-- and nullifies actor/reviewer reference columns without throwing FK constraint violation errors.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Dynamically drop existing foreign key constraints on target columns
  FOR r IN
    SELECT tc.table_schema, tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (
        (tc.table_name = 'access_logs' AND kcu.column_name = 'changed_by') OR
        (tc.table_name = 'audit_logs' AND kcu.column_name IN ('actor_user_id', 'target_user_id')) OR
        (tc.table_name = 'worker_attendance_corrections' AND kcu.column_name IN ('attendance_id', 'target_user_id', 'actor_user_id')) OR
        (tc.table_name = 'worker_absensi_corrections' AND kcu.column_name IN ('attendance_id', 'target_user_id', 'actor_user_id')) OR
        (tc.table_name = 'worker_records_override_log' AND kcu.column_name = 'actor_user_id') OR
        (tc.table_name = 'worker_sp_logs' AND kcu.column_name IN ('issued_by', 'revoked_by')) OR
        (tc.table_name = 'scheduled_attendance' AND kcu.column_name IN ('scheduled_by', 'cancelled_by'))
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- 2. Update column nullability where needed for ON DELETE SET NULL
ALTER TABLE public.worker_attendance_corrections
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE public.worker_absensi_corrections
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE public.worker_records_override_log
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE public.worker_sp_logs
  ALTER COLUMN issued_by DROP NOT NULL;

ALTER TABLE public.scheduled_attendance
  ALTER COLUMN scheduled_by DROP NOT NULL;

-- 3. Re-add foreign key constraints with ON DELETE CASCADE for target worker records
-- and ON DELETE SET NULL for audit/actor/reviewer references.

-- access_logs
ALTER TABLE public.access_logs
  ADD CONSTRAINT access_logs_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- audit_logs
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT audit_logs_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- worker_attendance_corrections
ALTER TABLE public.worker_attendance_corrections
  ADD CONSTRAINT worker_attendance_corrections_attendance_id_fkey
  FOREIGN KEY (attendance_id) REFERENCES public.worker_attendance(id) ON DELETE CASCADE,
  ADD CONSTRAINT worker_attendance_corrections_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT worker_attendance_corrections_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- worker_absensi_corrections
ALTER TABLE public.worker_absensi_corrections
  ADD CONSTRAINT worker_absensi_corrections_attendance_id_fkey
  FOREIGN KEY (attendance_id) REFERENCES public.worker_attendance(id) ON DELETE CASCADE,
  ADD CONSTRAINT worker_absensi_corrections_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT worker_absensi_corrections_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- worker_records_override_log
ALTER TABLE public.worker_records_override_log
  ADD CONSTRAINT worker_records_override_log_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- worker_sp_logs
ALTER TABLE public.worker_sp_logs
  ADD CONSTRAINT worker_sp_logs_issued_by_fkey
  FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT worker_sp_logs_revoked_by_fkey
  FOREIGN KEY (revoked_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- scheduled_attendance
ALTER TABLE public.scheduled_attendance
  ADD CONSTRAINT scheduled_attendance_scheduled_by_fkey
  FOREIGN KEY (scheduled_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT scheduled_attendance_cancelled_by_fkey
  FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;
