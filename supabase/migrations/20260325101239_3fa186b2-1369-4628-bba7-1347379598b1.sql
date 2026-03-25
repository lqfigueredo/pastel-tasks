
CREATE POLICY "Authenticated can delete non-default statuses"
ON public.task_statuses
FOR DELETE
TO authenticated
USING (is_default = false);
