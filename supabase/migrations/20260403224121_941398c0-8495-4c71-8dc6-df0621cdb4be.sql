
-- =====================================================
-- FIX 1: Work-instructions storage policies
-- =====================================================

-- SELECT: only team members
DROP POLICY IF EXISTS "Team members can read work instruction files" ON storage.objects;

CREATE POLICY "Team members can read work instruction files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'work-instructions'
  AND is_team_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- INSERT: only team members
DROP POLICY IF EXISTS "Authenticated can upload work instruction files" ON storage.objects;

CREATE POLICY "Team members can upload work instruction files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'work-instructions'
  AND is_team_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- DELETE: only team members
DROP POLICY IF EXISTS "Authenticated can delete work instruction files" ON storage.objects;

CREATE POLICY "Team members can delete work instruction files"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'work-instructions'
  AND is_team_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- =====================================================
-- FIX 2: Audit log injection - task_change_logs
-- =====================================================

DROP POLICY IF EXISTS "Authenticated can insert own logs" ON public.task_change_logs;

CREATE POLICY "Authenticated can insert own logs"
ON public.task_change_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    is_task_owner(task_id, auth.uid())
    OR is_task_assignee(task_id, auth.uid())
  )
);

-- =====================================================
-- FIX 3: Audit log injection - delivery_date_logs
-- =====================================================

DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.delivery_date_logs;

CREATE POLICY "Authenticated can insert logs"
ON public.delivery_date_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = changed_by
  AND (
    is_task_owner(task_id, auth.uid())
    OR is_task_assignee(task_id, auth.uid())
  )
);

-- =====================================================
-- FIX 4: Audit log injection - work_instruction_logs
-- =====================================================

DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.work_instruction_logs;

CREATE POLICY "Team members can insert instruction logs"
ON public.work_instruction_logs
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_instructions wi
    WHERE wi.id = instruction_id
    AND is_team_member(auth.uid(), wi.team_id)
  )
);
