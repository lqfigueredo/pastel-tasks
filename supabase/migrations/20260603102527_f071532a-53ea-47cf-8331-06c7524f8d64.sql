
-- Fix 1: user_approvals INSERT must ensure created_by_admin = auth.uid()
DROP POLICY IF EXISTS "Admins can insert approvals" ON public.user_approvals;
CREATE POLICY "Admins can insert approvals"
ON public.user_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND created_by_admin = auth.uid()
);

-- Fix 2: task-attachments storage INSERT must require uploader to be task owner or assignee
DROP POLICY IF EXISTS "Task members can upload attachments" ON storage.objects;
CREATE POLICY "Task members can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (
    public.is_task_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_task_assignee(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);
