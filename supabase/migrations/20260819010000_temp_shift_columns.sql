-- Migration: Add temp_shift and temp_shift_until columns to worker_profiles for temporary shift swap
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS temp_shift text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS temp_shift_until timestamptz DEFAULT NULL;

-- Constraint check for temp_shift if provided
ALTER TABLE public.worker_profiles
  DROP CONSTRAINT IF EXISTS worker_profiles_temp_shift_check;

ALTER TABLE public.worker_profiles
  ADD CONSTRAINT worker_profiles_temp_shift_check CHECK (
    temp_shift IS NULL OR temp_shift IN ('A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3', 'flexible')
  );
