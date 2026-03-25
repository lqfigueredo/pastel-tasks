CREATE POLICY "Admins can view all teams" ON public.teams
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));