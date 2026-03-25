
-- Tighten task_statuses insert policy to require authenticated user
DROP POLICY IF EXISTS "Authenticated can insert statuses" ON public.task_statuses;
CREATE POLICY "Authenticated users can insert statuses" ON public.task_statuses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
