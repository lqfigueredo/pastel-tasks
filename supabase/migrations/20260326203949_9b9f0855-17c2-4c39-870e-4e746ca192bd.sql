
-- Drop overly permissive write policies
DROP POLICY IF EXISTS "Authenticated can update statuses" ON public.task_statuses;
DROP POLICY IF EXISTS "Authenticated can delete non-default statuses" ON public.task_statuses;
DROP POLICY IF EXISTS "Authenticated users can insert statuses" ON public.task_statuses;

-- INSERT: team members can create statuses for their team, admins for global
CREATE POLICY "Team members can insert statuses"
ON public.task_statuses
FOR INSERT
TO authenticated
WITH CHECK (
  (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR
  (team_id IS NULL AND has_role(auth.uid(), 'admin'))
);

-- UPDATE: team members can update their team's statuses, admins for global
CREATE POLICY "Team members can update statuses"
ON public.task_statuses
FOR UPDATE
TO authenticated
USING (
  (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR
  (team_id IS NULL AND has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR
  (team_id IS NULL AND has_role(auth.uid(), 'admin'))
);

-- DELETE: team members can delete non-default statuses for their team
CREATE POLICY "Team members can delete statuses"
ON public.task_statuses
FOR DELETE
TO authenticated
USING (
  is_default = false
  AND (
    (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
    OR
    (team_id IS NULL AND has_role(auth.uid(), 'admin'))
  )
);
