CREATE POLICY "All users can view global statuses"
ON public.task_statuses FOR SELECT
TO authenticated
USING (team_id IS NULL);