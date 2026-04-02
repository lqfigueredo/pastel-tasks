
CREATE TABLE public.task_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task owner can view time entries" ON public.task_time_entries
  FOR SELECT TO authenticated
  USING (is_task_owner(task_id, auth.uid()));

CREATE POLICY "Assignees can view time entries" ON public.task_time_entries
  FOR SELECT TO authenticated
  USING (is_task_assignee(task_id, auth.uid()));

CREATE POLICY "Team members can view time entries" ON public.task_time_entries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_time_entries.task_id
      AND t.team_id IS NOT NULL
      AND is_team_member(auth.uid(), t.team_id)
  ));

CREATE POLICY "Users can manage own time entries" ON public.task_time_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_task_time_entries_task ON public.task_time_entries(task_id);
CREATE INDEX idx_task_time_entries_user ON public.task_time_entries(user_id);
