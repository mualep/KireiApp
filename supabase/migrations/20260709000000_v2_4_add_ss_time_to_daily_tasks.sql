-- Migration to add SS time tracking columns to daily_tasks
ALTER TABLE public.daily_tasks
  ADD COLUMN ss_before_time TIME,
  ADD COLUMN ss_after_time TIME,
  ADD COLUMN process_duration_minutes INTEGER,
  ADD CONSTRAINT daily_tasks_process_duration_minutes_check CHECK (process_duration_minutes >= 0);
