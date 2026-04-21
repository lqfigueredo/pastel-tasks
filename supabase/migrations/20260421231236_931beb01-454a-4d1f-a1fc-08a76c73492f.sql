-- Add explicit UPDATE policy on task-attachments bucket so behavior is intentional and not relying on absence.
-- Only the original uploader OR a task member can update an object. Path layout: <task_id>/<filename>.
CREATE POLICY "Task members can update attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.can_access_task(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.can_access_task(auth.uid(), ((storage.foldername(name))[1])::uuid)
);