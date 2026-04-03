
-- Helper function to check if user can access a task (owner, assignee, or team member)
CREATE OR REPLACE FUNCTION public.can_access_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks WHERE id = _task_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM task_assignees WHERE task_id = _task_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM tasks t
    JOIN team_members tm ON tm.team_id = t.team_id
    WHERE t.id = _task_id AND t.team_id IS NOT NULL AND tm.user_id = _user_id
  )
$$;

-- Fix task-attachments: drop broad SELECT, keep owner-path, add task-access check
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;

DROP POLICY IF EXISTS "Users can view own attachments" ON storage.objects;

CREATE POLICY "Users can view task attachments"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND can_access_task(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Fix meeting-attachments: replace broad SELECT with participant check
DROP POLICY IF EXISTS "Meeting participants can read" ON storage.objects;

CREATE POLICY "Meeting participants can read attachments"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'meeting-attachments'
  AND is_meeting_participant(auth.uid(), (storage.foldername(name))[2]::uuid)
);

-- Fix team-attachments: replace broad SELECT with team member check
DROP POLICY IF EXISTS "Team members can view team attachments" ON storage.objects;

CREATE POLICY "Team members can view team attachments"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'team-attachments'
  AND is_team_member(auth.uid(), (storage.foldername(name))[2]::uuid)
);
