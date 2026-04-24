CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _viewer_id = _target_id
    OR has_role(_viewer_id, 'solution_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_approvals ua
      WHERE (ua.created_by_admin = _viewer_id AND ua.user_id = _target_id)
         OR (ua.created_by_admin = _target_id AND ua.user_id = _viewer_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = _viewer_id AND tm2.user_id = _target_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.created_by = _target_id
        AND (t.created_by = _viewer_id
             OR is_task_assignee(t.id, _viewer_id)
             OR (t.team_id IS NOT NULL AND is_team_member(_viewer_id, t.team_id)))
    )
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      JOIN public.tasks t ON t.id = ta.task_id
      WHERE ta.user_id = _target_id
        AND (t.created_by = _viewer_id
             OR is_task_assignee(t.id, _viewer_id)
             OR (t.team_id IS NOT NULL AND is_team_member(_viewer_id, t.team_id)))
    )
$$;