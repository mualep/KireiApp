-- Migration: Phase V2-2 Daily Task Schema Initialization
-- 1. Create daily_task_config table
CREATE TABLE public.daily_task_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL,
  phase text NOT NULL,
  sort_order smallint NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT daily_task_config_phase_check CHECK (phase IN ('before_work', 'while_work', 'after_work'))
);

-- Index sorting and filtering paths
CREATE INDEX ON public.daily_task_config (game);
CREATE INDEX ON public.daily_task_config (phase, sort_order);

-- Standard set_updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.daily_task_config
  FOR EACH ROW
  EXECUTE FUNCTION app_private.set_updated_at();


-- 2. Create daily_tasks table
CREATE TABLE public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  shift_label text NOT NULL,
  stream_name text,
  selected_games text[] NOT NULL DEFAULT '{}',
  checklist_snapshot jsonb NOT NULL,
  checklist_answers jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_review',
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  editable_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT daily_tasks_status_check CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  CONSTRAINT daily_tasks_user_date_key UNIQUE (user_id, task_date)
);

-- Indexing foreign keys and filters
CREATE INDEX ON public.daily_tasks (user_id);
CREATE INDEX ON public.daily_tasks (task_date);
CREATE INDEX ON public.daily_tasks (reviewed_by);

-- Standard set_updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION app_private.set_updated_at();


-- 3. Enable RLS on both tables
ALTER TABLE public.daily_task_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;


-- 4. Define RLS Policies for daily_task_config
CREATE POLICY daily_task_config_admin_all
  ON public.daily_task_config
  FOR ALL
  TO authenticated
  USING (app_private.is_admin_or_owner())
  WITH CHECK (app_private.is_admin_or_owner());

CREATE POLICY daily_task_config_member_select
  ON public.daily_task_config
  FOR SELECT
  TO authenticated
  USING (is_active = true);


-- 5. Define RLS Policies for daily_tasks
CREATE POLICY daily_tasks_admin_all
  ON public.daily_tasks
  FOR ALL
  TO authenticated
  USING (app_private.is_admin_or_owner())
  WITH CHECK (app_private.is_admin_or_owner());

CREATE POLICY daily_tasks_member_select
  ON public.daily_tasks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY daily_tasks_member_insert
  ON public.daily_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('draft', 'pending_review', 'rejected')
  );

CREATE POLICY daily_tasks_member_update
  ON public.daily_tasks
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('draft', 'pending_review', 'rejected')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('draft', 'pending_review', 'rejected')
  );
