-- ============================================================
-- 1) FIX: Cross-tenant role manipulation on user_roles
-- ============================================================

-- Drop overly broad write policies
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Admin can INSERT roles only for users they approved, and never solution_admin
CREATE POLICY "Admins insert roles for own approved users"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role <> 'solution_admin'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id
      AND ua.created_by_admin = auth.uid()
  )
);

-- Admin can UPDATE roles only for users they approved, never to/from solution_admin
CREATE POLICY "Admins update roles for own approved users"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  role <> 'solution_admin'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id
      AND ua.created_by_admin = auth.uid()
  )
)
WITH CHECK (
  role <> 'solution_admin'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id
      AND ua.created_by_admin = auth.uid()
  )
);

-- Admin can DELETE roles only for users they approved, and never solution_admin rows
CREATE POLICY "Admins delete roles for own approved users"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  role <> 'solution_admin'::app_role
  AND has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_approvals ua
    WHERE ua.user_id = user_roles.user_id
      AND ua.created_by_admin = auth.uid()
  )
);

-- Solution admins retain full management (they already have SELECT; add ALL for completeness)
DROP POLICY IF EXISTS "Solution admins manage all roles" ON public.user_roles;
CREATE POLICY "Solution admins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

-- ============================================================
-- 2) FIX: idea-attachments storage — allow team members to read
-- ============================================================

CREATE POLICY "Team members can read shared idea attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'idea-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.idea_attachments ia
    JOIN public.ideas i ON i.id = ia.idea_id
    WHERE ia.file_path = storage.objects.name
      AND i.team_id IS NOT NULL
      AND public.is_team_member(auth.uid(), i.team_id)
  )
);