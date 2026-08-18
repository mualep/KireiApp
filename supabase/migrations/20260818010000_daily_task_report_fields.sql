-- Migration: Add Employee Report fields to daily_tasks
ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS task_description text,
  ADD COLUMN IF NOT EXISTS problem_notes text,
  ADD COLUMN IF NOT EXISTS ss_before_url text,
  ADD COLUMN IF NOT EXISTS ss_after_url text;
