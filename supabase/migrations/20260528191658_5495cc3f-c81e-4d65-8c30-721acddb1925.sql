DROP POLICY IF EXISTS "Admins insert roles for own approved users" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles for own approved users" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles for own approved users" ON public.user_roles;

CREATE POLICY "Admins insert user role for own approved users"
ON public.user_roles
FOR INSERT
WITH CHECK (
  role = 'user'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id AND ua.created_by_admin = auth.uid()
  )
);

CREATE POLICY "Admins update user role for own approved users"
ON public.user_roles
FOR UPDATE
USING (
  role = 'user'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id AND ua.created_by_admin = auth.uid()
  )
)
WITH CHECK (
  role = 'user'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id AND ua.created_by_admin = auth.uid()
  )
);

CREATE POLICY "Admins delete user role for own approved users"
ON public.user_roles
FOR DELETE
USING (
  role = 'user'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id AND ua.created_by_admin = auth.uid()
  )
);