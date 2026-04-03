
CREATE POLICY "Team members can view recurring tasks"
ON public.recurring_tasks
FOR SELECT TO authenticated
USING (
  team_id IS NOT NULL AND is_team_member(auth.uid(), team_id)
);
