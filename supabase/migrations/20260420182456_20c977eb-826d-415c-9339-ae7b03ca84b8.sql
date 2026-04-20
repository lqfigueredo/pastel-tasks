DROP POLICY "Users can update own saved filters" ON public.kanban_saved_filters;

CREATE POLICY "Users can update own saved filters"
ON public.kanban_saved_filters
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());