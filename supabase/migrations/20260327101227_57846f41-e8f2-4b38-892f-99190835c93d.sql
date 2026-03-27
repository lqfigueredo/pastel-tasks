CREATE POLICY "Creator can view own team"
ON public.teams
FOR SELECT
TO authenticated
USING (created_by = auth.uid());