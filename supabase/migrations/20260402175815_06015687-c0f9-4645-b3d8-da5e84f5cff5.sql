
CREATE POLICY "Task owner can manage idea links"
  ON public.idea_tasks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = idea_tasks.task_id AND created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE id = idea_tasks.task_id AND created_by = auth.uid())
  );
