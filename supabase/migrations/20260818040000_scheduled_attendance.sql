-- Migration: Create scheduled_attendance table and RPCs for future attendance scheduling
CREATE TABLE IF NOT EXISTS public.scheduled_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('cuti', 'sakit', 'pending', 'alpha')),
  scheduled_by uuid NOT NULL REFERENCES public.users(id),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz DEFAULT NULL,
  cancelled_at timestamptz DEFAULT NULL,
  cancelled_by uuid REFERENCES public.users(id) DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_attendance_user_target_date_unique UNIQUE (user_id, target_date)
);

-- Index for querying upcoming active schedules
CREATE INDEX IF NOT EXISTS idx_scheduled_attendance_active
  ON public.scheduled_attendance (target_date, user_id)
  WHERE applied_at IS NULL AND cancelled_at IS NULL;

-- Enable RLS
ALTER TABLE public.scheduled_attendance ENABLE ROW LEVEL SECURITY;

-- Allow select for authenticated staff
CREATE POLICY "Allow authenticated staff select scheduled_attendance"
  ON public.scheduled_attendance
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow full access for service_role
CREATE POLICY "Allow service_role full access scheduled_attendance"
  ON public.scheduled_attendance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC: create_scheduled_attendance
CREATE OR REPLACE FUNCTION public.create_scheduled_attendance(
  p_user_id uuid,
  p_target_date date,
  p_status text,
  p_notes text,
  p_admin_id uuid
)
RETURNS public.scheduled_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_wib date;
  v_cuti_stock integer;
  v_existing record;
  v_result public.scheduled_attendance;
BEGIN
  -- 1. Determine current date in WIB (Asia/Jakarta)
  v_today_wib := (now() AT TIME ZONE 'Asia/Jakarta')::date;

  -- 2. Verify target date is strictly in the future (> v_today_wib)
  IF p_target_date <= v_today_wib THEN
    RAISE EXCEPTION 'Tanggal penjadwalan harus lebih besar dari hari ini (%).', v_today_wib;
  END IF;

  -- 3. Verify status value
  IF p_status NOT IN ('cuti', 'sakit', 'pending', 'alpha') THEN
    RAISE EXCEPTION 'Status penjadwalan tidak valid: %.', p_status;
  END IF;

  -- 4. Check if active schedule already exists for this user and date
  SELECT id INTO v_existing
  FROM public.scheduled_attendance
  WHERE user_id = p_user_id
    AND target_date = p_target_date
    AND cancelled_at IS NULL
    AND applied_at IS NULL;

  IF FOUND THEN
    RAISE EXCEPTION 'Sudah ada penjadwalan absensi aktif untuk tanggal tersebut.';
  END IF;

  -- 5. Atomic cuti_stock deduction if status is 'cuti'
  IF p_status = 'cuti' THEN
    SELECT cuti_stock INTO v_cuti_stock
    FROM public.worker_profiles
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_cuti_stock IS NULL OR v_cuti_stock <= 0 THEN
      RAISE EXCEPTION 'Sisa stok cuti tidak mencukupi untuk melakukan penjadwalan cuti.';
    END IF;

    UPDATE public.worker_profiles
    SET cuti_stock = cuti_stock - 1,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- 6. Insert new scheduled_attendance record
  INSERT INTO public.scheduled_attendance (
    user_id,
    target_date,
    status,
    scheduled_by,
    scheduled_at,
    notes
  )
  VALUES (
    p_user_id,
    p_target_date,
    p_status,
    p_admin_id,
    now(),
    p_notes
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC: cancel_scheduled_attendance
CREATE OR REPLACE FUNCTION public.cancel_scheduled_attendance(
  p_schedule_id uuid,
  p_admin_id uuid
)
RETURNS public.scheduled_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule public.scheduled_attendance;
  v_result public.scheduled_attendance;
BEGIN
  -- 1. Fetch schedule record
  SELECT * INTO v_schedule
  FROM public.scheduled_attendance
  WHERE id = p_schedule_id
    AND cancelled_at IS NULL
    AND applied_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penjadwalan absensi tidak ditemukan atau sudah diproses/dibatalkan.';
  END IF;

  -- 2. Refund cuti_stock if status was 'cuti'
  IF v_schedule.status = 'cuti' THEN
    UPDATE public.worker_profiles
    SET cuti_stock = cuti_stock + 1,
        updated_at = now()
    WHERE user_id = v_schedule.user_id;
  END IF;

  -- 3. Mark schedule as cancelled
  UPDATE public.scheduled_attendance
  SET cancelled_at = now(),
      cancelled_by = p_admin_id,
      updated_at = now()
  WHERE id = p_schedule_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
