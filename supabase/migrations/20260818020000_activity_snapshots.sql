-- Migration: Create activity_snapshots table for hourly worker activity tracking
CREATE TABLE IF NOT EXISTS public.activity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  snapshot_hour smallint NOT NULL CHECK (snapshot_hour >= 0 AND snapshot_hour <= 23),
  status_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_snapshots_date_hour_unique UNIQUE (snapshot_date, snapshot_hour)
);

-- Enable RLS
ALTER TABLE public.activity_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow select for authenticated staff users
CREATE POLICY "Allow authenticated staff select activity_snapshots"
  ON public.activity_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service_role / cron full access
CREATE POLICY "Allow service_role full access activity_snapshots"
  ON public.activity_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
