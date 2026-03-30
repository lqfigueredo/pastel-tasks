CREATE POLICY "Assignees can view assigned tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = tasks.id
    AND task_assignees.user_id = auth.uid()
  )
);