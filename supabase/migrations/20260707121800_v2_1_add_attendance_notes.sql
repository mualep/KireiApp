-- Migration: Add notes column to worker_attendance for V2 sync
ALTER TABLE public.worker_attendance ADD COLUMN IF NOT EXISTS notes text;
