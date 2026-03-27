CREATE POLICY "Assignees can view task attachments"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = task_attachments.task_id
      AND task_assignees.user_id = auth.uid()
  )
);