
-- =====================================================
-- FIX 1: Scope ideas SELECT to owner or team members
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can view all ideas" ON public.ideas;

CREATE POLICY "Users can view own or team ideas"
ON public.ideas FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
);

-- =====================================================
-- FIX 2: Scope idea_attachments SELECT to idea owner/team
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can view idea attachments" ON public.idea_attachments;

CREATE POLICY "Users can view idea attachments"
ON public.idea_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_attachments.idea_id
    AND (
      ideas.created_by = auth.uid()
      OR (ideas.team_id IS NOT NULL AND is_team_member(auth.uid(), ideas.team_id))
    )
  )
);

-- =====================================================
-- FIX 3: Scope idea_tasks SELECT to idea owner/team or task owner/assignee
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can view idea_tasks" ON public.idea_tasks;

CREATE POLICY "Users can view idea_tasks"
ON public.idea_tasks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_tasks.idea_id
    AND (
      ideas.created_by = auth.uid()
      OR (ideas.team_id IS NOT NULL AND is_team_member(auth.uid(), ideas.team_id))
    )
  )
  OR EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = idea_tasks.task_id
    AND (
      tasks.created_by = auth.uid()
      OR is_task_assignee(idea_tasks.task_id, auth.uid())
    )
  )
);

-- =====================================================
-- FIX 4: Scope idea-attachments storage INSERT
-- Path format: {user_id}/{uuid}.ext
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can upload idea attachments" ON storage.objects;

CREATE POLICY "Idea owner can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'idea-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- FIX 5: Scope idea-attachments storage SELECT
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can read idea attachments" ON storage.objects;

CREATE POLICY "Idea owner can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'idea-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- FIX 6: Scope idea-attachments storage DELETE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can delete own idea attachments" ON storage.objects;

CREATE POLICY "Idea owner can delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'idea-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
