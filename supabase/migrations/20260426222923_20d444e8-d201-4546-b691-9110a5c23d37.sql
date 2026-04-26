-- Allow solution_admin to manage their own task statuses
DROP POLICY IF EXISTS "Users can insert statuses" ON public.task_statuses;
DROP POLICY IF EXISTS "Users can update own statuses" ON public.task_statuses;
DROP POLICY IF EXISTS "Users can delete own statuses" ON public.task_statuses;

CREATE POLICY "Users can insert statuses"
ON public.task_statuses
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
    OR (team_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'solution_admin'::app_role)
  )
);

CREATE POLICY "Users can update own statuses"
ON public.task_statuses
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR (has_role(auth.uid(), 'solution_admin'::app_role) AND created_by = auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR (has_role(auth.uid(), 'solution_admin'::app_role) AND created_by = auth.uid())
);

CREATE POLICY "Users can delete own statuses"
ON public.task_statuses
FOR DELETE
TO authenticated
USING (
  is_default = false
  AND (
    created_by = auth.uid()
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
    OR (has_role(auth.uid(), 'solution_admin'::app_role) AND created_by = auth.uid())
  )
);