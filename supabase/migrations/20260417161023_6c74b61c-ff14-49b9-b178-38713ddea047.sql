-- Trigger function to automatically log task changes
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  old_status_name text;
  new_status_name text;
BEGIN
  -- If no authenticated user (e.g. service role / edge function), skip logging
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- title
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'title', OLD.title, NEW.title);
  END IF;

  -- description
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'description', OLD.description, NEW.description);
  END IF;

  -- status (resolve names from task_statuses)
  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    SELECT name INTO old_status_name FROM public.task_statuses WHERE id = OLD.status_id;
    SELECT name INTO new_status_name FROM public.task_statuses WHERE id = NEW.status_id;
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'status', old_status_name, new_status_name);
  END IF;

  -- start_date
  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'start_date', OLD.start_date::text, NEW.start_date::text);
  END IF;

  -- estimated_delivery_date
  IF NEW.estimated_delivery_date IS DISTINCT FROM OLD.estimated_delivery_date THEN
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'estimated_delivery_date', OLD.estimated_delivery_date::text, NEW.estimated_delivery_date::text);
  END IF;

  -- actual_end_date
  IF NEW.actual_end_date IS DISTINCT FROM OLD.actual_end_date THEN
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'actual_end_date', OLD.actual_end_date::text, NEW.actual_end_date::text);
  END IF;

  -- is_critical
  IF NEW.is_critical IS DISTINCT FROM OLD.is_critical THEN
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor_id, 'is_critical', OLD.is_critical::text, NEW.is_critical::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_changes ON public.tasks;
CREATE TRIGGER trg_log_task_changes
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_changes();

-- Trigger function for assignee add/remove logging
CREATE OR REPLACE FUNCTION public.log_task_assignee_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  affected_user_name text;
BEGIN
  IF actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT display_name INTO affected_user_name FROM public.profiles WHERE user_id = NEW.user_id;
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.task_id, actor_id, 'assignee_added', NULL, COALESCE(affected_user_name, NEW.user_id::text));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT display_name INTO affected_user_name FROM public.profiles WHERE user_id = OLD.user_id;
    INSERT INTO public.task_change_logs (task_id, user_id, field_name, old_value, new_value)
    VALUES (OLD.task_id, actor_id, 'assignee_removed', COALESCE(affected_user_name, OLD.user_id::text), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_assignee_changes ON public.task_assignees;
CREATE TRIGGER trg_log_task_assignee_changes
AFTER INSERT OR DELETE ON public.task_assignees
FOR EACH ROW
EXECUTE FUNCTION public.log_task_assignee_changes();