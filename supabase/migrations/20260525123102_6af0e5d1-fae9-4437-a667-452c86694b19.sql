
-- Add UPDATE policy on task_attachments table restricted to uploader
CREATE POLICY "Uploader can update own task attachment"
ON public.task_attachments
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Replace storage UPDATE policy for task-attachments: only original uploader
DROP POLICY IF EXISTS "Task members can update attachments" ON storage.objects;
CREATE POLICY "Uploader can update task attachment file"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND EXISTS (
    SELECT 1 FROM public.task_attachments ta
    WHERE ta.file_path = storage.objects.name
      AND ta.uploaded_by = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'task-attachments'
  AND EXISTS (
    SELECT 1 FROM public.task_attachments ta
    WHERE ta.file_path = storage.objects.name
      AND ta.uploaded_by = auth.uid()
  )
);

-- Replace storage DELETE policy for task-attachments: uploader OR task owner
DROP POLICY IF EXISTS "Task members can delete attachments" ON storage.objects;
CREATE POLICY "Uploader or task owner can delete task attachment file"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.task_attachments ta
      WHERE ta.file_path = storage.objects.name
        AND (
          ta.uploaded_by = auth.uid()
          OR public.is_task_owner(ta.task_id, auth.uid())
        )
    )
  )
);
