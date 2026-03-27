CREATE POLICY "Solution admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));