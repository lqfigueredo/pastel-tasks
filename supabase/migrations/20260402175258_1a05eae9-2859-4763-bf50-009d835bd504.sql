CREATE TABLE public.idea_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  linked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(idea_id, task_id)
);

ALTER TABLE public.idea_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view idea_tasks"
  ON public.idea_tasks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Idea owner can manage links"
  ON public.idea_tasks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM ideas WHERE id = idea_tasks.idea_id AND created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM ideas WHERE id = idea_tasks.idea_id AND created_by = auth.uid())
  );