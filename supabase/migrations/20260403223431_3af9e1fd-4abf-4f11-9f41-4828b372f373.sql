
DROP POLICY IF EXISTS "Authenticated can add comments" ON public.task_comments;

CREATE POLICY "Authenticated can add comments"
ON public.task_comments
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    is_task_owner(task_id, auth.uid())
    OR is_task_assignee(task_id, auth.uid())
  )
);
