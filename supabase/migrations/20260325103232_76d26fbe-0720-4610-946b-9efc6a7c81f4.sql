-- Allow authenticated users to update any status (name, color)
CREATE POLICY "Authenticated can update statuses"
ON public.task_statuses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert the fallback "Não Afiliado" status
INSERT INTO public.task_statuses (name, color, position, is_default)
VALUES ('Não Afiliado', '#CFD8DC', 0, true);