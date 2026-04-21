-- Remove legacy storage policies that allowed any authenticated user to upload/delete
-- in any task folder by placing their own user_id as the first segment.
-- The "Task members can upload/delete attachments" policies (using can_access_task) remain
-- and properly enforce per-task access using the actual <task_id>/<file> path layout.

DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;