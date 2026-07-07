-- Migration: Phase V2-3 Activity Snapshots Schema
-- 1. Create activity_snapshots table
CREATE TABLE public.activity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_hour smallint NOT NULL CHECK (snapshot_hour >= 0 AND snapshot_hour <= 23),
  snapshot_date date NOT NULL,
  status_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT activity_snapshots_date_hour_key UNIQUE (snapshot_date, snapshot_hour)
);

-- Indexing for lookup speed
CREATE INDEX ON public.activity_snapshots (snapshot_date);

-- 2. Enable RLS
ALTER TABLE public.activity_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies for Owner/Admin only
CREATE POLICY activity_snapshots_admin_all
  ON public.activity_snapshots
  FOR ALL
  TO authenticated
  USING (app_private.is_admin_or_owner())
  WITH CHECK (app_private.is_admin_or_owner());
