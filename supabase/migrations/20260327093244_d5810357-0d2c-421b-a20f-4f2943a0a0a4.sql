CREATE POLICY "Assignees can view task change logs"
ON public.task_change_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = task_change_logs.task_id
      AND task_assignees.user_id = auth.uid()
  )
);