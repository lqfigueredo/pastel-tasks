
CREATE POLICY "Team members can add comments"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
      AND t.team_id IS NOT NULL
      AND is_team_member(auth.uid(), t.team_id)
  )
);

CREATE POLICY "Team members can view task comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
      AND t.team_id IS NOT NULL
      AND is_team_member(auth.uid(), t.team_id)
  )
);
