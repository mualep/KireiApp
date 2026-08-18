-- Migration: Ensure audit_logs is readable by authenticated staff (Admin & Owner)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select audit_logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated select audit_logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full audit_logs" ON public.audit_logs;
CREATE POLICY "Allow service_role full audit_logs"
  ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
