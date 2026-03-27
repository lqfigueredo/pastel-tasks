CREATE POLICY "Users can view own approval"
ON public.user_approvals
FOR SELECT
TO authenticated
USING (user_id = auth.uid());