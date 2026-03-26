
CREATE TABLE public.task_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert own logs"
ON public.task_change_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Task owner can view logs"
ON public.task_change_logs
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks WHERE tasks.id = task_change_logs.task_id AND tasks.created_by = auth.uid()
));

CREATE INDEX idx_task_change_logs_task_id ON public.task_change_logs(task_id);
