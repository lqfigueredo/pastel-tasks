
ALTER TABLE public.user_approvals ADD COLUMN created_by_admin uuid;

CREATE POLICY "Admins can view own created approvals"
ON public.user_approvals
FOR SELECT
TO authenticated
USING (created_by_admin = auth.uid());
