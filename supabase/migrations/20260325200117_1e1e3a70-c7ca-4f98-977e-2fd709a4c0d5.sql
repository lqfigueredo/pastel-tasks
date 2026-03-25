
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create recurring_tasks table
CREATE TABLE public.recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status_id uuid NOT NULL REFERENCES public.task_statuses(id),
  created_by uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  assignee_ids uuid[] DEFAULT '{}',
  recurrence_type text NOT NULL,
  recurrence_day integer,
  next_run_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_recurrence_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.recurrence_type NOT IN ('weekly', 'monthly', 'yearly') THEN
    RAISE EXCEPTION 'recurrence_type must be weekly, monthly, or yearly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_recurrence_type
  BEFORE INSERT OR UPDATE ON public.recurring_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_recurrence_type();

-- RLS for recurring_tasks
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage recurring tasks"
  ON public.recurring_tasks FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Add recurring_task_id to tasks table
ALTER TABLE public.tasks ADD COLUMN recurring_task_id uuid REFERENCES public.recurring_tasks(id);
