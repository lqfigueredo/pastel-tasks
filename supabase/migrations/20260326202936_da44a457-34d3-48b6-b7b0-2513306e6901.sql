CREATE POLICY "Assignees can view task comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = task_comments.task_id
      AND task_assignees.user_id = auth.uid()
  )
);