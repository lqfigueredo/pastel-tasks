CREATE POLICY "Team members can view task assignees"
  ON public.task_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND t.team_id IS NOT NULL
        AND is_team_member(auth.uid(), t.team_id)
    )
  );