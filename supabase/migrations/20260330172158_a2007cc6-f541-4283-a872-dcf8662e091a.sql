
-- 1. Create SECURITY DEFINER functions to break RLS recursion

CREATE OR REPLACE FUNCTION public.is_task_assignee(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = _task_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_task_owner(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = _task_id AND created_by = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_task_assignee FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_assignee TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_task_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_owner TO authenticated;

-- 2. Fix tasks policies
DROP POLICY IF EXISTS "Assignees can view assigned tasks" ON public.tasks;
CREATE POLICY "Assignees can view assigned tasks"
ON public.tasks FOR SELECT TO authenticated
USING (public.is_task_assignee(id, auth.uid()));

-- Add UPDATE for assignees so they can move cards
CREATE POLICY "Assignees can update assigned tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (public.is_task_assignee(id, auth.uid()));

-- 3. Fix task_assignees policies
DROP POLICY IF EXISTS "Task owner can manage assignees" ON public.task_assignees;
CREATE POLICY "Task owner can manage assignees"
ON public.task_assignees FOR ALL TO authenticated
USING (public.is_task_owner(task_id, auth.uid()))
WITH CHECK (public.is_task_owner(task_id, auth.uid()));

-- 4. Fix task_comments policies
DROP POLICY IF EXISTS "Assignees can view task comments" ON public.task_comments;
CREATE POLICY "Assignees can view task comments"
ON public.task_comments FOR SELECT TO authenticated
USING (public.is_task_assignee(task_id, auth.uid()));

DROP POLICY IF EXISTS "Task participants can view comments" ON public.task_comments;
CREATE POLICY "Task participants can view comments"
ON public.task_comments FOR SELECT TO authenticated
USING (public.is_task_owner(task_id, auth.uid()));

-- 5. Fix task_change_logs policies
DROP POLICY IF EXISTS "Assignees can view task change logs" ON public.task_change_logs;
CREATE POLICY "Assignees can view task change logs"
ON public.task_change_logs FOR SELECT TO authenticated
USING (public.is_task_assignee(task_id, auth.uid()));

DROP POLICY IF EXISTS "Task owner can view logs" ON public.task_change_logs;
CREATE POLICY "Task owner can view logs"
ON public.task_change_logs FOR SELECT TO authenticated
USING (public.is_task_owner(task_id, auth.uid()));

-- 6. Fix task_attachments policies
DROP POLICY IF EXISTS "Assignees can view task attachments" ON public.task_attachments;
CREATE POLICY "Assignees can view task attachments"
ON public.task_attachments FOR SELECT TO authenticated
USING (public.is_task_assignee(task_id, auth.uid()));

DROP POLICY IF EXISTS "Task owner can manage attachments" ON public.task_attachments;
CREATE POLICY "Task owner can manage attachments"
ON public.task_attachments FOR ALL TO authenticated
USING (public.is_task_owner(task_id, auth.uid()));

-- 7. Fix delivery_date_logs policies
DROP POLICY IF EXISTS "Task owner can view logs" ON public.delivery_date_logs;
CREATE POLICY "Task owner can view delivery logs"
ON public.delivery_date_logs FOR SELECT TO authenticated
USING (public.is_task_owner(task_id, auth.uid()));

-- Add assignee view for delivery logs
CREATE POLICY "Assignees can view delivery logs"
ON public.delivery_date_logs FOR SELECT TO authenticated
USING (public.is_task_assignee(task_id, auth.uid()));
