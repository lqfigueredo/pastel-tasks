
-- Fix teams SELECT policy (bug: team_members.id should be teams.id)
DROP POLICY IF EXISTS "Members can view team" ON public.teams;
CREATE POLICY "Members can view team" ON public.teams
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()
  ));

-- Creator can update team
CREATE POLICY "Creator can update team" ON public.teams
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Creator can delete team
CREATE POLICY "Creator can delete team" ON public.teams
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Team members can view team tasks
CREATE POLICY "Team members can view team tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
